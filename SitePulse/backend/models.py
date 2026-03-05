from sqlalchemy import (
    create_engine, Column, String, Integer,
    Boolean, Text, DateTime, ForeignKey
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
import uuid, os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./uptime.db")

# Render sends "postgres://" — SQLAlchemy needs "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)


class Website(Base):
    __tablename__ = "websites"

    id                     = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name                   = Column(String(255), nullable=False)
    url                    = Column(String(2048), nullable=False)
    interval_seconds       = Column(Integer, default=60)
    expected_status_code   = Column(Integer, default=200)
    alert_preference       = Column(String(50), default="none")
    is_active              = Column(Boolean, default=True)
    timeout_seconds        = Column(Integer, default=30)
    retry_count            = Column(Integer, default=3)
    response_time_threshold= Column(Integer, default=2000)
    created_at             = Column(DateTime, default=datetime.utcnow)

    results   = relationship("MonitoringResult", back_populates="website", cascade="all, delete-orphan")
    incidents = relationship("IncidentLog",      back_populates="website", cascade="all, delete-orphan")


class MonitoringResult(Base):
    __tablename__ = "monitoring_results"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    website_id      = Column(String(36), ForeignKey("websites.id", ondelete="CASCADE"))
    timestamp       = Column(DateTime, default=datetime.utcnow)
    status          = Column(String(20))      # UP | DOWN | SLOW | SSL_ERROR
    response_time_ms= Column(Integer,  nullable=True)
    http_status_code= Column(Integer,  nullable=True)
    error_message   = Column(Text,     nullable=True)
    ssl_expiry_days = Column(Integer,  nullable=True)

    website = relationship("Website", back_populates="results")


class IncidentLog(Base):
    __tablename__ = "incident_logs"

    id               = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    website_id       = Column(String(36), ForeignKey("websites.id", ondelete="CASCADE"))
    started_at       = Column(DateTime, default=datetime.utcnow)
    resolved_at      = Column(DateTime, nullable=True)
    failure_type     = Column(String(100), nullable=True)
    http_status_code = Column(Integer,    nullable=True)
    error_message    = Column(Text,       nullable=True)
    is_resolved      = Column(Boolean,    default=False)
    duration_seconds = Column(Integer,    nullable=True)

    website = relationship("Website", back_populates="incidents")
