"""
Pydantic schemas for API requests/responses
"""

from pydantic import BaseModel, validator
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from enum import Enum

class LogLevel(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class LogAnalysisRequest(BaseModel):
    logs: Union[List[str], str]
    context: Optional[str] = None
    source: Optional[str] = "manual"

    @validator('logs', pre=True)
    def validate_logs(cls, v):
        if isinstance(v, str):
            return [line.strip() for line in v.split('\n') if line.strip()]
        elif isinstance(v, list):
            return [str(log).strip() for log in v if str(log).strip()]
        return []

class SystemStatus(BaseModel):
    status: str
    timestamp: datetime
    services: Dict[str, bool]
    health_score: float

class DeploymentRequest(BaseModel):
    repository: str
    branch: str
    commit_hash: str
    environment: str = "staging"
    force_deploy: bool = False

class PipelineStatus(BaseModel):
    job_name: str
    status: str
    last_build: Optional[int]
    duration: Optional[int]
    timestamp: datetime

class AlertRequest(BaseModel):
    severity: LogLevel
    message: str
    source: str
    metadata: Optional[Dict[str, Any]] = {}

class MetricsData(BaseModel):
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    network_io: Dict[str, float]
    timestamp: datetime
