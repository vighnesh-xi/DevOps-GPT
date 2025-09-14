/**
 * DevOps-GPT Frontend Application
 * Main JavaScript file for core functionality
 */

class DevOpsGPTApp {
    constructor() {
        this.config = {
            apiBaseUrl: '/api',
            wsUrl: `ws://${window.location.host}/ws`,
            updateInterval: 5000
        };

        this.state = {
            connected: false,
            systemStatus: {},
            alerts: []
        };

        this.init();
    }

    async init() {
        console.log('🚀 Initializing DevOps-GPT Frontend...');

        // Initialize WebSocket connection
        this.initWebSocket();

        // Load initial system status
        await this.loadSystemStatus();

        // Setup event listeners
        this.setupEventListeners();

        console.log('✅ DevOps-GPT Frontend initialized');
    }

    initWebSocket() {
        try {
            this.ws = new WebSocket(this.config.wsUrl);

            this.ws.onopen = () => {
                console.log('🔌 WebSocket connected');
                this.state.connected = true;
                this.updateConnectionStatus(true);
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleRealtimeUpdate(data);
            };

            this.ws.onclose = () => {
                console.log('🔌 WebSocket disconnected');
                this.state.connected = false;
                this.updateConnectionStatus(false);

                // Attempt to reconnect after 5 seconds
                setTimeout(() => this.initWebSocket(), 5000);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
        }
    }

    async loadSystemStatus() {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/status`);
            const data = await response.json();
            this.state.systemStatus = data;
            this.updateUI(data);
        } catch (error) {
            console.error('Failed to load system status:', error);
        }
    }

    handleRealtimeUpdate(data) {
        console.log('📡 Real-time update received:', data.type);

        switch (data.type) {
            case 'status_update':
                this.updateSystemStatus(data);
                break;
            case 'deployment_started':
                this.showNotification('Deployment started', 'info');
                break;
            case 'deployment_completed':
                this.showNotification('Deployment completed', 'success');
                break;
            case 'deployment_failed':
                this.showNotification('Deployment failed', 'error');
                break;
            case 'rollback_triggered':
                this.showNotification('Rollback triggered', 'warning');
                break;
            case 'alert':
                this.handleAlert(data);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    updateSystemStatus(data) {
        this.state.systemStatus = { ...this.state.systemStatus, ...data };
        this.updateUI(data);
    }

    updateUI(data) {
        // Update status indicators
        this.updateStatusIndicators(data);

        // Update metrics
        this.updateMetrics(data);

        // Update activity feed
        this.updateActivityFeed(data);
    }

    updateStatusIndicators(data) {
        const elements = {
            'infrastructure-status': data.infrastructure?.health || 'Unknown',
            'pipeline-status': data.pipelines?.status || 'Unknown',
            'deployment-count': data.system?.deployment_count || 0,
            'alert-count': this.state.alerts.length
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    updateMetrics(data) {
        // Update charts if they exist
        if (window.healthChart && data.system?.health_score !== undefined) {
            this.updateHealthChart(data.system.health_score);
        }
    }

    updateActivityFeed(data) {
        const feed = document.getElementById('activity-feed');
        if (!feed) return;

        const activity = document.createElement('div');
        activity.className = 'activity-item';
        activity.innerHTML = `
            <div class="activity-time">${new Date().toLocaleTimeString()}</div>
            <div class="activity-content">
                <i class="fas fa-info-circle"></i>
                System status updated
            </div>
        `;

        feed.insertBefore(activity, feed.firstChild);

        // Keep only last 10 activities
        while (feed.children.length > 10) {
            feed.removeChild(feed.lastChild);
        }
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.className = `status-indicator ${connected ? 'connected' : 'disconnected'}`;
            statusElement.innerHTML = `
                <i class="fas fa-circle"></i> 
                ${connected ? 'Connected' : 'Disconnected'}
            `;
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to notification container
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        container.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'info': 'info-circle',
            'success': 'check-circle',
            'warning': 'exclamation-triangle',
            'error': 'times-circle'
        };
        return icons[type] || 'info-circle';
    }

    handleAlert(alertData) {
        this.state.alerts.push(alertData);
        this.showNotification(alertData.message, alertData.severity.toLowerCase());

        // Update alert count
        const alertCount = document.getElementById('alert-count');
        if (alertCount) {
            alertCount.textContent = this.state.alerts.length;
        }
    }

    setupEventListeners() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
        });

        // Handle visibility change (pause updates when tab is hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('Tab hidden - reducing update frequency');
            } else {
                console.log('Tab visible - resuming normal updates');
            }
        });
    }

    // Public API methods
    async analyzeLogsAPI(logs, context = null) {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/logs/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    logs: logs,
                    context: context
                })
            });

            return await response.json();
        } catch (error) {
            console.error('Log analysis failed:', error);
            throw error;
        }
    }

    async triggerJenkinsBuild(jobName, parameters = {}) {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/jenkins/build/${jobName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(parameters)
            });

            return await response.json();
        } catch (error) {
            console.error('Jenkins build trigger failed:', error);
            throw error;
        }
    }

    async restartK8sDeployment(deploymentName, namespace = 'default') {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/kubernetes/restart/${deploymentName}?namespace=${namespace}`, {
                method: 'POST'
            });

            return await response.json();
        } catch (error) {
            console.error('Kubernetes restart failed:', error);
            throw error;
        }
    }

    async getAIRecommendations() {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/ai/recommendations`);
            return await response.json();
        } catch (error) {
            console.error('Failed to get AI recommendations:', error);
            throw error;
        }
    }
}

// Global functions for button clicks
async function triggerAnalysis() {
    document.getElementById('logModal').style.display = 'block';
}

async function checkPipelineHealth() {
    const app = window.devopsApp;
    try {
        const response = await fetch('/api/jenkins/jobs');
        const data = await response.json();
        app.showNotification(`Pipeline health check: ${data.status}`, 'info');
    } catch (error) {
        app.showNotification('Pipeline health check failed', 'error');
    }
}

async function triggerDeployment() {
    const app = window.devopsApp;
    app.showNotification('Deployment triggered', 'info');
    // Add deployment logic here
}

async function emergencyRollback() {
    const app = window.devopsApp;
    if (confirm('Are you sure you want to trigger an emergency rollback?')) {
        try {
            const response = await fetch('/api/jenkins/rollback/main-pipeline', {
                method: 'POST'
            });
            const result = await response.json();
            app.showNotification('Emergency rollback initiated', 'warning');
        } catch (error) {
            app.showNotification('Rollback failed', 'error');
        }
    }
}

async function analyzeLogsFromModal() {
    const app = window.devopsApp;
    const logInput = document.getElementById('logInput');
    const spinner = document.getElementById('analyzeSpinner');
    const results = document.getElementById('analysisResults');

    if (!logInput.value.trim()) {
        app.showNotification('Please enter some logs to analyze', 'warning');
        return;
    }

    spinner.style.display = 'inline-block';

    try {
        const analysis = await app.analyzeLogsAPI(logInput.value);

        results.innerHTML = `
            <div class="analysis-result">
                <h4>Analysis Results</h4>
                <div class="analysis-status status-${analysis.analysis.severity.toLowerCase()}">
                    Status: ${analysis.analysis.status}
                </div>
                <div class="analysis-recommendations">
                    <h5>Recommendations:</h5>
                    <ul>
                        ${analysis.analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    } catch (error) {
        results.innerHTML = `<div class="error">Analysis failed: ${error.message}</div>`;
    } finally {
        spinner.style.display = 'none';
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.devopsApp = new DevOpsGPTApp();
});
