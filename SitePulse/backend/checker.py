"""
checker.py — HTTP monitoring engine
• DNS check → SSL check → HTTP request → classify result
• Retries before declaring DOWN (avoids false positives)
"""

import requests
import socket
import ssl
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional

# Maps HTTP status codes → (failure_type, human description)
FAILURE_MAP = {
    400: ("BAD_REQUEST",         "Client sent a malformed request"),
    401: ("AUTH_FAILURE",        "Authentication required — check API tokens"),
    403: ("FORBIDDEN",           "Access denied — IP may be blocked by WAF"),
    404: ("NOT_FOUND",           "Resource not found — URL may have changed"),
    429: ("RATE_LIMITED",        "Too many requests — server is rate limiting"),
    500: ("SERVER_ERROR",        "Internal server error — backend crashed"),
    502: ("BAD_GATEWAY",         "Bad gateway — upstream service unreachable"),
    503: ("SERVICE_UNAVAILABLE", "Server overloaded or in maintenance"),
    504: ("GATEWAY_TIMEOUT",     "Reverse proxy timeout — backend unresponsive"),
}

CAUSE_MAP = {
    "DNS_FAILURE":        "Domain doesn't resolve — DNS misconfiguration or expired domain",
    "TIMEOUT":            "Server not responding — possible overload or network issue",
    "CONNECTION_REFUSED": "Server refused connection — firewall or service is down",
    "SSL_EXPIRED":        "SSL certificate has expired — renew it immediately",
    "SSL_ERROR":          "SSL handshake failed — certificate mismatch or invalid cert",
    "SERVER_ERROR":       "Backend server crashed or threw an unhandled exception",
    "SERVICE_UNAVAILABLE":"Server under maintenance or starved of resources",
    "GATEWAY_TIMEOUT":    "Reverse proxy can't reach the application server in time",
    "SLOW_RESPONSE":      "High latency — database queries or third-party API slowdown",
    "NOT_FOUND":          "Target URL moved or resource was deleted",
    "RATE_LIMITED":       "Client is being throttled — reduce check frequency",
}


def get_possible_cause(failure_type: Optional[str]) -> str:
    if not failure_type:
        return "Unknown root cause — manual investigation required"
    return CAUSE_MAP.get(failure_type, "Unknown root cause — manual investigation required")


def _check_dns(hostname: str) -> bool:
    try:
        socket.gethostbyname(hostname)
        return True
    except socket.gaierror:
        return False


def _check_ssl_expiry(hostname: str) -> Optional[int]:
    """Returns days until SSL expiry. Negative = already expired. None = check failed."""
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((hostname, 443), timeout=10) as sock:
            with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                expire_str  = cert["notAfter"]
                expire_date = datetime.strptime(expire_str, "%b %d %H:%M:%S %Y %Z")
                expire_date = expire_date.replace(tzinfo=timezone.utc)
                delta = expire_date - datetime.now(timezone.utc)
                return delta.days
    except Exception:
        return None


def _classify(status_code: int) -> str:
    if status_code in FAILURE_MAP:
        return FAILURE_MAP[status_code][0]
    if 400 <= status_code < 500:
        return "CLIENT_ERROR"
    if 500 <= status_code < 600:
        return "SERVER_ERROR"
    return "UNKNOWN"


def check_website(
    url: str,
    expected_status: int = 200,
    timeout: int = 30,
    threshold_ms: int = 2000,
) -> Dict[str, Any]:
    """
    Run a single full health check:
    1. DNS resolution
    2. SSL certificate expiry (HTTPS only)
    3. HTTP request + timing
    """
    result = {
        "status":           "DOWN",
        "response_time_ms": None,
        "http_status_code": None,
        "error_message":    None,
        "ssl_expiry_days":  None,
        "dns_resolved":     False,
        "failure_type":     None,
    }

    # Parse hostname from URL
    hostname = url.replace("https://", "").replace("http://", "").split("/")[0].split("?")[0]

    # Step 1: DNS
    if not _check_dns(hostname):
        result["error_message"] = f"DNS resolution failed for {hostname}"
        result["failure_type"]  = "DNS_FAILURE"
        return result
    result["dns_resolved"] = True

    # Step 2: SSL expiry (HTTPS only)
    if url.startswith("https://"):
        days = _check_ssl_expiry(hostname)
        result["ssl_expiry_days"] = days
        if days is not None and days <= 0:
            result["status"]        = "SSL_ERROR"
            result["error_message"] = "SSL certificate has expired"
            result["failure_type"]  = "SSL_EXPIRED"
            return result

    # Step 3: HTTP request
    start = time.monotonic()
    try:
        resp = requests.get(
            url,
            timeout=timeout,
            allow_redirects=True,
            headers={"User-Agent": "UptimeSentry/1.0 Monitor"},
            verify=True,
        )
        elapsed = int((time.monotonic() - start) * 1000)
        result["response_time_ms"] = elapsed
        result["http_status_code"] = resp.status_code

        if resp.status_code == expected_status:
            if elapsed > threshold_ms:
                result["status"]        = "SLOW"
                result["failure_type"]  = "SLOW_RESPONSE"
                result["error_message"] = (
                    f"Response time {elapsed}ms exceeds threshold {threshold_ms}ms"
                )
            else:
                result["status"] = "UP"
        else:
            result["status"]        = "DOWN"
            result["failure_type"]  = _classify(resp.status_code)
            result["error_message"] = (
                f"Expected HTTP {expected_status}, got {resp.status_code}"
            )

    except requests.exceptions.Timeout:
        result["failure_type"]  = "TIMEOUT"
        result["error_message"] = "Connection timed out"
    except requests.exceptions.ConnectionError:
        result["failure_type"]  = "CONNECTION_REFUSED"
        result["error_message"] = "Connection refused by server"
    except requests.exceptions.SSLError as e:
        result["status"]        = "SSL_ERROR"
        result["failure_type"]  = "SSL_ERROR"
        result["error_message"] = f"SSL error: {str(e)[:100]}"
    except Exception as e:
        result["failure_type"]  = "UNKNOWN"
        result["error_message"] = str(e)[:200]

    return result


def check_with_retries(
    url: str,
    expected_status: int = 200,
    timeout: int = 30,
    threshold_ms: int = 2000,
    retries: int = 3,
) -> Dict[str, Any]:
    """
    Retry failed checks with exponential backoff before declaring DOWN.
    Returns immediately on first UP result.
    """
    last = None
    for attempt in range(retries):
        result = check_website(url, expected_status, timeout, threshold_ms)
        last = result
        if result["status"] == "UP":
            return result
        if attempt < retries - 1:
            time.sleep(2 ** attempt)   # 1s → 2s → 4s
    return last
