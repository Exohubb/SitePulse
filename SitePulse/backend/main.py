"""
main.py — UptimeSentry (Vercel Serverless Edition)
• No APScheduler — checks triggered via /api/run-checks endpoint
• Called every minute by cron-job.org (free)
• Uses Neon PostgreSQL (never sleeps, never expires)
"""

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

from models import Website, MonitoringResult, IncidentLog, get_db, init_db, SessionLocal
from checker import check_with_retries, get_possible_cause

load_dotenv()

# ── App ────────────────────────────────────────────────────────────
app = FastAPI(
    title="UptimeSentry API",
    description="Website Uptime Monitoring & Failure Analysis",
    version="1.0.0",
)

# Init DB tables on first cold start
@app.on_event("startup")
def startup():
    init_db()

ALLOWED = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic schemas ───────────────────────────────────────────────
class WebsiteCreate(BaseModel):
    name:                    str
    url:                     str
    interval_seconds:        int  = 60
    expected_status_code:    int  = 200
    alert_preference:        str  = "none"
    timeout_seconds:         int  = 30
    retry_count:             int  = 3
    response_time_threshold: int  = 2000

class WebsiteUpdate(BaseModel):
    name:                    Optional[str]  = None
    interval_seconds:        Optional[int]  = None
    expected_status_code:    Optional[int]  = None
    alert_preference:        Optional[str]  = None
    is_active:               Optional[bool] = None
    response_time_threshold: Optional[int]  = None


# ── Helper ─────────────────────────────────────────────────────────
def _website_dict(w: Website, db: Session) -> dict:
    latest = (
        db.query(MonitoringResult)
        .filter(MonitoringResult.website_id == w.id)
        .order_by(desc(MonitoringResult.timestamp))
        .first()
    )
    return {
        "id":                     w.id,
        "name":                   w.name,
        "url":                    w.url,
        "interval_seconds":       w.interval_seconds,
        "expected_status_code":   w.expected_status_code,
        "alert_preference":       w.alert_preference,
        "is_active":              w.is_active,
        "timeout_seconds":        w.timeout_seconds,
        "retry_count":            w.retry_count,
        "response_time_threshold":w.response_time_threshold,
        "created_at":             w.created_at.isoformat() if w.created_at else None,
        "last_status":            latest.status           if latest else "UNKNOWN",
        "last_response_time_ms":  latest.response_time_ms if latest else None,
        "last_http_code":         latest.http_status_code if latest else None,
        "last_checked":           latest.timestamp.isoformat() if latest else None,
        "ssl_expiry_days":        latest.ssl_expiry_days  if latest else None,
    }


# ══════════════════════════════════════════════════════════════════
#  MONITORING RUNNER  (called by cron-job.org every minute)
# ══════════════════════════════════════════════════════════════════

def run_checks_logic(db: Session) -> list:
    """
    Pure DB-driven check runner — no in-memory state.
    Works perfectly on serverless because incident state lives in DB.
    """
    websites = db.query(Website).filter(Website.is_active == True).all()
    summary  = []

    for w in websites:
        try:
            result = check_with_retries(
                url=             w.url,
                expected_status= w.expected_status_code,
                timeout=         min(w.timeout_seconds, 25),  # cap at 25s for Vercel
                threshold_ms=    w.response_time_threshold,
                retries=         w.retry_count,
            )

            # Save monitoring result
            mr = MonitoringResult(
                website_id=      w.id,
                status=          result["status"],
                response_time_ms=result.get("response_time_ms"),
                http_status_code=result.get("http_status_code"),
                error_message=   result.get("error_message"),
                ssl_expiry_days= result.get("ssl_expiry_days"),
            )
            db.add(mr)
            db.flush()

            # Find any currently open incident for this website
            open_incident = (
                db.query(IncidentLog)
                .filter(
                    IncidentLog.website_id  == w.id,
                    IncidentLog.is_resolved == False,
                )
                .first()
            )

            # Site is DOWN → open incident if not already open
            if result["status"] in ("DOWN", "SSL_ERROR"):
                if not open_incident:
                    incident = IncidentLog(
                        website_id=      w.id,
                        failure_type=    result.get("failure_type"),
                        http_status_code=result.get("http_status_code"),
                        error_message=   result.get("error_message"),
                    )
                    db.add(incident)

            # Site is UP → resolve any open incident
            elif result["status"] == "UP" and open_incident:
                now = datetime.utcnow()
                open_incident.is_resolved     = True
                open_incident.resolved_at     = now
                open_incident.duration_seconds= int(
                    (now - open_incident.started_at).total_seconds()
                )

            db.commit()
            summary.append({
                "website": w.name,
                "url":     w.url,
                "status":  result["status"],
                "rt_ms":   result.get("response_time_ms"),
            })

        except Exception as e:
            db.rollback()
            summary.append({"website": w.name, "url": w.url, "status": "ERROR", "error": str(e)})

    return summary


@app.post("/api/run-checks")
def trigger_checks(db: Session = Depends(get_db)):
    """
    Called by cron-job.org every minute.
    Checks all active monitors and saves results to DB.
    """
    results = run_checks_logic(db)
    return {
        "checked": len(results),
        "timestamp": datetime.utcnow().isoformat(),
        "results": results,
    }


# ══════════════════════════════════════════════════════════════════
#  WEBSITE ROUTES
# ══════════════════════════════════════════════════════════════════

@app.get("/api/websites")
def list_websites(db: Session = Depends(get_db)):
    websites = db.query(Website).order_by(desc(Website.created_at)).all()
    return [_website_dict(w, db) for w in websites]


@app.post("/api/websites", status_code=201)
def create_website(data: WebsiteCreate, db: Session = Depends(get_db)):
    w = Website(**data.model_dump())
    db.add(w)
    db.commit()
    db.refresh(w)
    return _website_dict(w, db)


@app.get("/api/websites/{wid}")
def get_website(wid: str, db: Session = Depends(get_db)):
    w = db.query(Website).filter(Website.id == wid).first()
    if not w:
        raise HTTPException(404, "Monitor not found")
    return _website_dict(w, db)


@app.patch("/api/websites/{wid}")
def update_website(wid: str, data: WebsiteUpdate, db: Session = Depends(get_db)):
    w = db.query(Website).filter(Website.id == wid).first()
    if not w:
        raise HTTPException(404, "Monitor not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(w, k, v)
    db.commit()
    db.refresh(w)
    return _website_dict(w, db)


@app.delete("/api/websites/{wid}", status_code=204)
def delete_website(wid: str, db: Session = Depends(get_db)):
    w = db.query(Website).filter(Website.id == wid).first()
    if not w:
        raise HTTPException(404, "Monitor not found")
    db.delete(w)
    db.commit()


@app.get("/api/websites/{wid}/results")
def get_results(wid: str, limit: int = 100, db: Session = Depends(get_db)):
    rows = (
        db.query(MonitoringResult)
        .filter(MonitoringResult.website_id == wid)
        .order_by(desc(MonitoringResult.timestamp))
        .limit(limit)
        .all()
    )
    return [
        {
            "id":               r.id,
            "timestamp":        r.timestamp.isoformat(),
            "status":           r.status,
            "response_time_ms": r.response_time_ms,
            "http_status_code": r.http_status_code,
            "error_message":    r.error_message,
            "ssl_expiry_days":  r.ssl_expiry_days,
        }
        for r in rows
    ]


@app.get("/api/websites/{wid}/logs")
def get_website_logs(
    wid:    str,
    limit:  int           = 200,
    status: Optional[str] = None,
    db:     Session       = Depends(get_db),
):
    q = db.query(MonitoringResult).filter(MonitoringResult.website_id == wid)
    if status:
        q = q.filter(MonitoringResult.status == status)
    rows = q.order_by(desc(MonitoringResult.timestamp)).limit(limit).all()
    return [
        {
            "id":               r.id,
            "timestamp":        r.timestamp.isoformat(),
            "status":           r.status,
            "response_time_ms": r.response_time_ms,
            "http_status_code": r.http_status_code,
            "error_message":    r.error_message,
            "ssl_expiry_days":  r.ssl_expiry_days,
        }
        for r in rows
    ]


# ══════════════════════════════════════════════════════════════════
#  DASHBOARD ROUTES
# ══════════════════════════════════════════════════════════════════

@app.get("/api/dashboard/stats")
def get_stats(db: Session = Depends(get_db)):
    websites  = db.query(Website).all()
    total     = len(websites)
    up = down = slow = 0
    total_rt  = rt_count = 0

    for w in websites:
        latest = (
            db.query(MonitoringResult)
            .filter(MonitoringResult.website_id == w.id)
            .order_by(desc(MonitoringResult.timestamp))
            .first()
        )
        if latest:
            if latest.status == "UP":    up   += 1
            elif latest.status == "DOWN": down += 1
            elif latest.status == "SLOW": slow += 1
            if latest.response_time_ms:
                total_rt  += latest.response_time_ms
                rt_count  += 1

    since        = datetime.utcnow() - timedelta(hours=24)
    total_checks = db.query(MonitoringResult).filter(MonitoringResult.timestamp >= since).count()
    up_checks    = db.query(MonitoringResult).filter(
        MonitoringResult.timestamp >= since,
        MonitoringResult.status == "UP"
    ).count()
    uptime_pct     = round(up_checks / total_checks * 100, 2) if total_checks else 0
    today_incidents= db.query(IncidentLog).filter(IncidentLog.started_at >= since).count()
    active_inc     = db.query(IncidentLog).filter(IncidentLog.is_resolved == False).count()

    return {
        "total_monitors":        total,
        "monitors_up":           up,
        "monitors_down":         down,
        "monitors_slow":         slow,
        "avg_uptime_percentage": uptime_pct,
        "avg_response_time_ms":  round(total_rt / rt_count, 1) if rt_count else 0,
        "total_incidents_today": today_incidents,
        "active_incidents":      active_inc,
    }


@app.get("/api/dashboard/history/{wid}")
def get_history(wid: str, hours: int = 24, db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(hours=hours)
    rows  = (
        db.query(MonitoringResult)
        .filter(
            MonitoringResult.website_id == wid,
            MonitoringResult.timestamp  >= since,
        )
        .order_by(MonitoringResult.timestamp)
        .all()
    )
    def fmt(ts):
        if hours <= 6:   return ts.strftime("%H:%M")
        if hours <= 24:  return ts.strftime("%H:%M")
        if hours <= 168: return ts.strftime("%a %H:%M")
        return ts.strftime("%b %d")

    return [
        {
            "time":           fmt(r.timestamp),
            "avg_response_ms":r.response_time_ms or 0,
            "uptime_pct":     100 if r.status == "UP" else 0,
            "status":         r.status,
            "timestamp":      r.timestamp.isoformat(),
        }
        for r in rows
    ]


@app.get("/api/websites/{wid}/dashboard")
def get_website_dashboard(wid: str, db: Session = Depends(get_db)):
    from sqlalchemy import func
    w = db.query(Website).filter(Website.id == wid).first()
    if not w:
        raise HTTPException(404, "Monitor not found")

    def period_stats(hours: int) -> dict:
        since = datetime.utcnow() - timedelta(hours=hours)
        rows  = (
            db.query(MonitoringResult)
            .filter(MonitoringResult.website_id == wid, MonitoringResult.timestamp >= since)
            .all()
        )
        total   = len(rows)
        up      = sum(1 for r in rows if r.status == "UP")
        down    = sum(1 for r in rows if r.status in ("DOWN", "SSL_ERROR"))
        slow    = sum(1 for r in rows if r.status == "SLOW")
        rt_vals = [r.response_time_ms for r in rows if r.response_time_ms and r.status == "UP"]
        return {
            "total":      total,
            "up":         up,
            "down":       down,
            "slow":       slow,
            "uptime_pct": round(up / total * 100, 2) if total else 0,
            "avg_rt":     round(sum(rt_vals) / len(rt_vals), 1) if rt_vals else 0,
            "min_rt":     min(rt_vals) if rt_vals else 0,
            "max_rt":     max(rt_vals) if rt_vals else 0,
        }

    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    thirty_day_bar = []
    for i in range(29, -1, -1):
        day_start = today - timedelta(days=i)
        day_end   = day_start + timedelta(days=1)
        day_rows  = (
            db.query(MonitoringResult)
            .filter(
                MonitoringResult.website_id == wid,
                MonitoringResult.timestamp  >= day_start,
                MonitoringResult.timestamp  <  day_end,
            )
            .all()
        )
        total = len(day_rows)
        up    = sum(1 for r in day_rows if r.status == "UP")
        down  = sum(1 for r in day_rows if r.status in ("DOWN", "SSL_ERROR"))
        pct   = round(up / total * 100, 1) if total else None
        thirty_day_bar.append({
            "date":         day_start.strftime("%Y-%m-%d"),
            "label":        day_start.strftime("%b %d"),
            "uptime_pct":   pct,
            "total_checks": total,
            "up_checks":    up,
            "down_checks":  down,
            "status":       ("NO_DATA" if total == 0 else "UP" if pct >= 99 else "SLOW" if pct >= 90 else "DOWN"),
        })

    latest    = (
        db.query(MonitoringResult)
        .filter(MonitoringResult.website_id == wid)
        .order_by(desc(MonitoringResult.timestamp))
        .first()
    )
    incidents = (
        db.query(IncidentLog)
        .filter(IncidentLog.website_id == wid)
        .order_by(desc(IncidentLog.started_at))
        .limit(20)
        .all()
    )
    return {
        "website":        _website_dict(w, db),
        "stats_1h":       period_stats(1),
        "stats_24h":      period_stats(24),
        "stats_7d":       period_stats(24 * 7),
        "stats_30d":      period_stats(24 * 30),
        "thirty_day_bar": thirty_day_bar,
        "current_status": latest.status if latest else "UNKNOWN",
        "last_checked":   latest.timestamp.isoformat() if latest else None,
        "incidents": [
            {
                "id":               i.id,
                "started_at":       i.started_at.isoformat(),
                "resolved_at":      i.resolved_at.isoformat() if i.resolved_at else None,
                "failure_type":     i.failure_type,
                "http_status_code": i.http_status_code,
                "error_message":    i.error_message,
                "is_resolved":      i.is_resolved,
                "duration_seconds": i.duration_seconds,
                "possible_cause":   get_possible_cause(i.failure_type),
            }
            for i in incidents
        ],
    }


# ══════════════════════════════════════════════════════════════════
#  INCIDENTS
# ══════════════════════════════════════════════════════════════════

@app.get("/api/incidents")
def list_incidents(
    limit:    int            = 50,
    resolved: Optional[bool] = None,
    db:       Session        = Depends(get_db),
):
    q = db.query(IncidentLog).order_by(desc(IncidentLog.started_at))
    if resolved is not None:
        q = q.filter(IncidentLog.is_resolved == resolved)
    return [
        {
            "id":               i.id,
            "website_id":       i.website_id,
            "started_at":       i.started_at.isoformat(),
            "resolved_at":      i.resolved_at.isoformat() if i.resolved_at else None,
            "failure_type":     i.failure_type,
            "http_status_code": i.http_status_code,
            "error_message":    i.error_message,
            "is_resolved":      i.is_resolved,
            "duration_seconds": i.duration_seconds,
            "possible_cause":   get_possible_cause(i.failure_type),
        }
        for i in q.limit(limit).all()
    ]


# ── Health ─────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "mode": "vercel-serverless"}
