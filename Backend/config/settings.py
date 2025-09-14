"""
Application configuration management
"""

import os
from typing import Optional
from pydantic import BaseSettings


class Settings(BaseSettings):
    # API Configuration
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "DevOps-GPT"

    # Jenkins Configuration
    JENKINS_URL: Optional[str] = os.getenv("JENKINS_URL", "http://localhost:8080")
    JENKINS_USERNAME: Optional[str] = os.getenv("JENKINS_USERNAME")
    JENKINS_TOKEN: Optional[str] = os.getenv("JENKINS_TOKEN")

    # Kubernetes Configuration
    KUBERNETES_CONFIG_PATH: Optional[str] = os.getenv("KUBERNETES_CONFIG_PATH")
    KUBERNETES_NAMESPACE: str = os.getenv("KUBERNETES_NAMESPACE", "default")

    # GitHub Configuration
    GITHUB_TOKEN: Optional[str] = os.getenv("GITHUB_TOKEN")
    GITHUB_WEBHOOK_SECRET: Optional[str] = os.getenv("GITHUB_WEBHOOK_SECRET")

    # AI Configuration
    MISTRAL_API_KEY: Optional[str] = os.getenv("MISTRAL_API_KEY")
    MISTRAL_MODEL: str = os.getenv("MISTRAL_MODEL", "mistral-tiny")

    # Database Configuration (for future use)
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")

    # Monitoring Configuration
    PROMETHEUS_URL: Optional[str] = os.getenv("PROMETHEUS_URL", "http://localhost:9090")
    GRAFANA_URL: Optional[str] = os.getenv("GRAFANA_URL", "http://localhost:3000")

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")

    # Application Settings
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    class Config:
        env_file = ".env"
        case_sensitive = True
