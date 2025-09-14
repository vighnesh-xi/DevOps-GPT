"""
DevOps-GPT Main Application
AI-Powered DevOps Automation Platform
"""

from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import logging
import json
from datetime import datetime
from typing import List

from config.settings import Settings
from models.log_analyzer import MistralAgent, LogAnalysisRequest
from models.schemas import SystemStatus, DeploymentRequest
from devops_integrations.mcp_orchestrator import MCPOrchestrator
from devops_integrations.jenkins_client import JenkinsIntegrator
from devops_integrations.kubernetes_client import KubernetesIntegrator
from devops_integrations.github_client import GitHubIntegrator
from ai_agents.deployment_agent import DeploymentAgent
from ai_agents.monitoring_agent import MonitoringAgent
from ai_agents.remediation_agent import RemediationAgent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize settings
settings = Settings()

# Initialize FastAPI app
app = FastAPI(
    title="DevOps-GPT - AI-Powered DevOps Automation",
    description="Intelligent DevOps automation with real-time monitoring and AI-driven insights",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Initialize core components
mistral_agent = MistralAgent()
mcp_orchestrator = MCPOrchestrator()
jenkins_client = JenkinsIntegrator()
k8s_client = KubernetesIntegrator()
github_client = GitHubIntegrator()

# Initialize AI agents
deployment_agent = DeploymentAgent()
monitoring_agent = MonitoringAgent()
remediation_agent = RemediationAgent()


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                # Remove dead connections
                self.active_connections.remove(connection)


manager = ConnectionManager()


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("🚀 Starting DevOps-GPT Platform...")

    # Start real-time monitoring
    asyncio.create_task(mcp_orchestrator.start_real_time_monitoring())
    asyncio.create_task(monitoring_agent.start_monitoring())

    logger.info("✅ DevOps-GPT Platform initialized successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Clean shutdown"""
    logger.info("⏹️ Shutting down DevOps-GPT Platform...")
    mcp_orchestrator.stop_monitoring()
    monitoring_agent.stop_monitoring()


# 🎨 FRONTEND ROUTES
@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Main DevOps Dashboard"""
    system_status = mcp_orchestrator.get_current_status()
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "system_status": system_status,
        "title": "DevOps-GPT Dashboard"
    })


@app.get("/logs", response_class=HTMLResponse)
async def logs_page(request: Request):
    """Log Analysis Page"""
    return templates.TemplateResponse("components/log_viewer.html", {
        "request": request,
        "title": "Log Analysis"
    })


@app.get("/pipelines", response_class=HTMLResponse)
async def pipelines_page(request: Request):
    """Pipeline Status Page"""
    return templates.TemplateResponse("components/pipeline_status.html", {
        "request": request,
        "title": "Pipeline Status"
    })


# 🔌 WEBSOCKET ENDPOINT
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time communication with frontend"""
    await manager.connect(websocket)
    try:
        while True:
            # Send real-time system status every 5 seconds
            status = mcp_orchestrator.get_current_status()
            pipeline_status = await jenkins_client.get_pipeline_status()
            k8s_status = await k8s_client.get_cluster_status()

            real_time_data = {
                "timestamp": datetime.now().isoformat(),
                "system": status,
                "pipelines": pipeline_status,
                "infrastructure": k8s_status,
                "type": "status_update"
            }

            await manager.send_personal_message(json.dumps(real_time_data), websocket)
            await asyncio.sleep(5)

    except WebSocketDisconnect:
        manager.disconnect(websocket)


# 🚀 API ROUTES

# System Status APIs
@app.get("/api/status")
async def get_system_status():
    """Get comprehensive system status"""
    return {
        "system": mcp_orchestrator.get_current_status(),
        "jenkins": await jenkins_client.get_pipeline_status(),
        "kubernetes": await k8s_client.get_cluster_status(),
        "github": await github_client.get_repo_status(),
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "jenkins": jenkins_client.client is not None,
            "kubernetes": k8s_client.v1 is not None,
            "ai": not mistral_agent.mock_mode
        }
    }


# Log Analysis APIs
@app.post("/api/logs/analyze")
async def analyze_logs(request: LogAnalysisRequest):
    """Analyze logs using AI"""
    try:
        analysis = await mistral_agent.analyze_logs(request.logs, request.context)

        # Trigger automated response if critical
        if analysis.get("severity") == "HIGH":
            remediation = await remediation_agent.suggest_fixes(analysis)
            analysis["automated_remediation"] = remediation

        return {"success": True, "analysis": analysis}
    except Exception as e:
        logger.error(f"Log analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/logs/live")
async def get_live_logs():
    """Get live logs from all sources"""
    jenkins_logs = await jenkins_client.get_build_logs("main-pipeline")
    k8s_logs = await k8s_client.get_pod_logs()

    return {
        "jenkins_logs": jenkins_logs[-100:],
        "kubernetes_logs": k8s_logs[-100:],
        "timestamp": datetime.now().isoformat()
    }


# DevOps Integration APIs
@app.get("/api/jenkins/jobs")
async def get_jenkins_jobs():
    """Get all Jenkins jobs"""
    return await jenkins_client.get_pipeline_status()


@app.post("/api/jenkins/build/{job_name}")
async def trigger_jenkins_build(job_name: str, parameters: dict = None):
    """Trigger Jenkins build"""
    return await jenkins_client.trigger_build(job_name, parameters)


@app.post("/api/jenkins/rollback/{job_name}")
async def trigger_rollback(job_name: str):
    """Trigger automated rollback"""
    result = await jenkins_client.trigger_rollback(job_name)

    # Broadcast to all connected clients
    await manager.broadcast({
        "type": "rollback_triggered",
        "job": job_name,
        "result": result,
        "timestamp": datetime.now().isoformat()
    })

    return result


@app.get("/api/kubernetes/pods")
async def get_k8s_pods():
    """Get Kubernetes pods status"""
    return await k8s_client.get_cluster_status()


@app.post("/api/kubernetes/restart/{deployment_name}")
async def restart_deployment(deployment_name: str, namespace: str = "default"):
    """Restart Kubernetes deployment"""
    result = await k8s_client.restart_deployment(deployment_name, namespace)

    # Broadcast to all connected clients
    await manager.broadcast({
        "type": "deployment_restarted",
        "deployment": deployment_name,
        "namespace": namespace,
        "result": result,
        "timestamp": datetime.now().isoformat()
    })

    return result


# AI Agent APIs
@app.post("/api/ai/deploy")
async def ai_deployment_decision(request: DeploymentRequest):
    """AI-powered deployment decision"""
    decision = await deployment_agent.analyze_deployment_readiness(request)
    return decision


@app.get("/api/ai/recommendations")
async def get_ai_recommendations():
    """Get AI-generated recommendations"""
    system_data = mcp_orchestrator.get_current_status()
    recommendations = await remediation_agent.generate_recommendations(system_data)
    return recommendations


# GitHub Integration APIs
@app.get("/api/github/repos")
async def get_github_repos():
    """Get GitHub repositories"""
    return await github_client.get_repositories()


@app.post("/api/github/webhook")
async def github_webhook(request: Request):
    """Handle GitHub webhooks"""
    payload = await request.json()

    # Process webhook and trigger CI/CD if needed
    if payload.get("action") == "opened" and "pull_request" in payload:
        # Trigger automated testing
        pr_analysis = await deployment_agent.analyze_pr(payload)

        await manager.broadcast({
            "type": "pr_opened",
            "pr": payload["pull_request"],
            "analysis": pr_analysis,
            "timestamp": datetime.now().isoformat()
        })

    return {"status": "webhook_processed"}


# Configuration APIs
@app.get("/api/config")
async def get_configuration():
    """Get system configuration"""
    return {
        "jenkins_url": settings.JENKINS_URL,
        "kubernetes_connected": k8s_client.v1 is not None,
        "ai_enabled": not mistral_agent.mock_mode,
        "monitoring_interval": 30
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
