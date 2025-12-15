// API configuration for DevOps-GPT Frontend
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes for AI analysis and GitHub operations
  headers: {
    'Content-Type': 'application/json',
  },
};

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/profile',
  },
  
  // Dashboard
  DASHBOARD: {
    STATS: '/dashboard/stats',
    RECENT_DEPLOYMENTS: '/dashboard/recent-deployments',
    SYSTEM_HEALTH: '/dashboard/system-health',
  },
  
  // Logs
  LOGS: {
    ANALYZE: '/logs/analyze',
    RECENT: '/logs/recent',
    SEARCH: '/logs/search',
    AUTOFIX: '/autofix/apply',
    AUTOFIX_PLAN: '/autofix/plan',
    AUTOFIX_APPLY_LOCAL: '/autofix/apply-local',
    AUTOFIX_APPLY_GITHUB: '/autofix/apply-github',
  },
  
  // Anomalies
  ANOMALIES: {
    DETECT: '/anomalies/detect',
    RECENT: '/anomalies/recent',
    RESOLVE: '/anomalies/resolve',
  },
  
  // Recommendations
  RECOMMENDATIONS: {
    GET: '/recommendations',
    GENERATE: '/recommendations/generate',
    APPROVE: '/recommendations/approve',
    REJECT: '/recommendations/reject',
  },
  
  // GitHub
  GITHUB: {
    REPOSITORIES: '/github/repositories',
    WEBHOOK: '/github/webhook',
    DEPLOYMENTS: '/github/deployments',
    ANALYZE_LOGS: '/analyze-github-logs',
    APPLY_FIXES: '/apply-fixes',
    STATUS: '/github/status',
    COMMIT: '/github/commit',
    CREATE_PR: '/github/create-pr',
  },
  
  // Settings
  SETTINGS: {
    GET: '/settings',
    UPDATE: '/settings',
  },
  
  // Health
  HEALTH: '/health',
  STATUS: '/status',
};

// API client class
export class ApiClient {
  private baseURL: string;
  private timeout: number;
  private headers: Record<string, string>;

  constructor(config = apiConfig) {
    this.baseURL = config.baseURL;
    this.timeout = config.timeout;
    this.headers = config.headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    };

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    config.signal = controller.signal;

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        throw new Error(`API request failed: ${error.message}`);
      }
      throw error;
    }
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = params 
      ? `${endpoint}?${new URLSearchParams(params).toString()}`
      : endpoint;
    
    return this.request<T>(url, {
      method: 'GET',
    });
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

// Create API client instance
export const apiClient = new ApiClient();

// API service functions
export const apiService = {
  // Health check
  async healthCheck() {
    return apiClient.get(API_ENDPOINTS.HEALTH);
  },

  // Authentication
  auth: {
    async login(username: string, password: string) {
      return apiClient.post(API_ENDPOINTS.AUTH.LOGIN, { username, password });
    },
    
    async logout() {
      return apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    },
    
    async getProfile() {
      return apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
    },
  },

  // Dashboard
  dashboard: {
    async getStats() {
      return apiClient.get(API_ENDPOINTS.DASHBOARD.STATS);
    },
    
    async getRecentDeployments(limit = 10) {
      return apiClient.get(API_ENDPOINTS.DASHBOARD.RECENT_DEPLOYMENTS, { 
        limit: limit.toString() 
      });
    },
    
    async getSystemHealth() {
      return apiClient.get(API_ENDPOINTS.DASHBOARD.SYSTEM_HEALTH);
    },
  },

  // Logs
  logs: {
    async analyze(logs: string[], service?: string) {
      return apiClient.post(API_ENDPOINTS.LOGS.ANALYZE, { logs, service });
    },
    
    async getRecent(limit = 50, level?: string) {
      const params: Record<string, string> = { limit: limit.toString() };
      if (level) params.level = level;
      return apiClient.get(API_ENDPOINTS.LOGS.RECENT, params);
    },
    
    async search(query: string, limit = 20) {
      return apiClient.get(API_ENDPOINTS.LOGS.SEARCH, { query, limit: limit.toString() });
    },

    async autofix(logs: string[]) {
      return apiClient.post(API_ENDPOINTS.LOGS.AUTOFIX, { logs });
    },

    async autofixPlan(request: { github_url?: string, logs?: string[], context?: string }) {
      return apiClient.post(API_ENDPOINTS.LOGS.AUTOFIX_PLAN, request);
    },

    async autofixApplyLocal(request: { edits: any[], deletes?: string[], test_command?: string }) {
      return apiClient.post(API_ENDPOINTS.LOGS.AUTOFIX_APPLY_LOCAL, request);
    },

    async autofixApplyGitHub(request: { github_url: string, fixes: any[], create_pr?: boolean, target_branch?: string, commit_message_prefix?: string }) {
      return apiClient.post(API_ENDPOINTS.LOGS.AUTOFIX_APPLY_GITHUB, request);
    },
  },

  // Anomalies
  anomalies: {
    async detect(request?: { metrics: any[], threshold?: number, time_window?: string, service_name?: string }) {
      if (request) {
        return apiClient.post(API_ENDPOINTS.ANOMALIES.DETECT, request);
      }
      return apiClient.get(API_ENDPOINTS.ANOMALIES.DETECT);
    },
    
    async getRecent(limit = 20) {
      return apiClient.get(API_ENDPOINTS.ANOMALIES.RECENT, { limit: limit.toString() });
    },
    
    async resolve(anomalyId: string) {
      return apiClient.post(`${API_ENDPOINTS.ANOMALIES.RESOLVE}/${anomalyId}`);
    },
  },

  // Recommendations
  recommendations: {
    async get() {
      return apiClient.get(API_ENDPOINTS.RECOMMENDATIONS.GET);
    },
    
    async generate(request: { deployment_data?: any, metrics?: any[], error_logs?: string[], service_name?: string, context?: string }) {
      return apiClient.post(API_ENDPOINTS.RECOMMENDATIONS.GENERATE, request);
    },
    
    async approve(recommendationId: string) {
      return apiClient.post(`${API_ENDPOINTS.RECOMMENDATIONS.APPROVE}/${recommendationId}`);
    },
    
    async reject(recommendationId: string) {
      return apiClient.post(`${API_ENDPOINTS.RECOMMENDATIONS.REJECT}/${recommendationId}`);
    },
  },

  // GitHub
  github: {
    async getRepositories() {
      return apiClient.get(API_ENDPOINTS.GITHUB.REPOSITORIES);
    },
    
    async webhook(payload: any) {
      return apiClient.post(API_ENDPOINTS.GITHUB.WEBHOOK, payload);
    },
    
    async getDeployments(repoName: string, limit = 10) {
      return apiClient.get(`${API_ENDPOINTS.GITHUB.DEPLOYMENTS}/${repoName}`, {
        limit: limit.toString()
      });
    },

    async analyzeLogs(repoUrl: string, logs: string[] | string, context?: string) {
      return apiClient.post(API_ENDPOINTS.GITHUB.ANALYZE_LOGS, {
        github_url: repoUrl,
        logs,
        context,
      });
    },

    async applyFixes(repoUrl: string, filePath: string, issueDescription: string, suggestedFix: string) {
      return apiClient.post(API_ENDPOINTS.GITHUB.APPLY_FIXES, {
        repository_url: repoUrl,
        file_path: filePath,
        issue_description: issueDescription,
        suggested_fix: suggestedFix,
      });
    },

    async getStatus() {
      return apiClient.get(API_ENDPOINTS.GITHUB.STATUS);
    },

    async commitFile(request: { github_url: string, file_path: string, content: string, commit_message: string, branch?: string }) {
      return apiClient.post(API_ENDPOINTS.GITHUB.COMMIT, request);
    },

    async createPR(request: { github_url: string, changes: any[], pr_title: string, pr_body: string, base_branch?: string }) {
      return apiClient.post(API_ENDPOINTS.GITHUB.CREATE_PR, request);
    },
  },

  // Settings
  settings: {
    async get() {
      return apiClient.get(API_ENDPOINTS.SETTINGS.GET);
    },
    
    async update(settings: any) {
      return apiClient.put(API_ENDPOINTS.SETTINGS.UPDATE, settings);
    },
  },
};

export default apiService;