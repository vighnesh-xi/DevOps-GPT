// Mock data generators for DevOps dashboard

export interface Deployment {
  id: string;
  name: string;
  status: 'success' | 'warning' | 'error' | 'pending';
  buildTime: number;
  timestamp: Date;
  environment: string;
  branch: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  service: string;
}

export interface MetricData {
  timestamp: Date;
  cpu: number;
  memory: number;
  requests: number;
}

export interface Anomaly {
  id: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  title: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
  rootCause?: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'performance' | 'security' | 'cost' | 'reliability';
  codeSnippet?: string;
  approved: boolean;
}

// Mock data generators
export const generateDeployments = (): Deployment[] => {
  const statuses: Deployment['status'][] = ['success', 'warning', 'error', 'pending'];
  const environments = ['production', 'staging', 'development'];
  const services = ['auth-service', 'api-gateway', 'user-service', 'payment-service', 'notification-service'];
  
  return Array.from({ length: 8 }, (_, i) => ({
    id: `deploy-${i + 1}`,
    name: services[i % services.length],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    buildTime: Math.floor(Math.random() * 300) + 30,
    timestamp: new Date(Date.now() - Math.random() * 3600000),
    environment: environments[Math.floor(Math.random() * environments.length)],
    branch: Math.random() > 0.7 ? 'main' : `feature/dev-${i + 1}`
  }));
};

export const generateLogs = (count: number = 100): LogEntry[] => {
  const levels: LogEntry['level'][] = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
  const services = ['auth-service', 'api-gateway', 'user-service', 'payment-service'];
  const messages = [
    'Request processed successfully',
    'Database connection established',
    'Memory usage high',
    'Authentication failed',
    'Cache miss for key',
    'API rate limit exceeded',
    'Service health check passed',
    'Deployment completed',
    'Error parsing JSON request',
    'User session expired'
  ];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `log-${i + 1}`,
    timestamp: new Date(Date.now() - Math.random() * 86400000),
    level: levels[Math.floor(Math.random() * levels.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
    service: services[Math.floor(Math.random() * services.length)]
  }));
};

export const generateMetrics = (hours: number = 24): MetricData[] => {
  return Array.from({ length: hours }, (_, i) => ({
    timestamp: new Date(Date.now() - (hours - i) * 3600000),
    cpu: Math.random() * 80 + 10,
    memory: Math.random() * 70 + 15,
    requests: Math.floor(Math.random() * 1000) + 100
  }));
};

export const generateAnomalies = (): Anomaly[] => {
  const severities: Anomaly['severity'][] = ['P0', 'P1', 'P2', 'P3'];
  const anomalies = [
    { title: 'High CPU Usage', description: 'CPU usage exceeded 90% for 5 minutes', rootCause: 'Memory leak in auth-service' },
    { title: 'API Rate Limit Hit', description: 'Rate limit exceeded on /api/users endpoint', rootCause: 'Sudden spike in user registrations' },
    { title: 'Database Connection Pool Full', description: 'All database connections in use', rootCause: 'Long-running queries not optimized' },
    { title: 'Disk Space Low', description: 'Available disk space below 10%', rootCause: 'Log files not being rotated properly' }
  ];
  
  return anomalies.map((anomaly, i) => ({
    id: `anomaly-${i + 1}`,
    severity: severities[Math.floor(Math.random() * severities.length)],
    title: anomaly.title,
    description: anomaly.description,
    timestamp: new Date(Date.now() - Math.random() * 86400000),
    resolved: Math.random() > 0.4,
    rootCause: anomaly.rootCause
  }));
};

export const generateRecommendations = (): Recommendation[] => {
  const priorities: Recommendation['priority'][] = ['high', 'medium', 'low'];
  const categories: Recommendation['category'][] = ['performance', 'security', 'cost', 'reliability'];
  
  const recommendations = [
    {
      title: 'Optimize Database Queries',
      description: 'Add indexes to frequently queried columns to improve performance',
      codeSnippet: 'CREATE INDEX idx_user_email ON users(email);'
    },
    {
      title: 'Enable Request Caching',
      description: 'Implement Redis caching for API responses to reduce database load',
      codeSnippet: 'redis.setex(cacheKey, 3600, JSON.stringify(data));'
    },
    {
      title: 'Update Security Headers',
      description: 'Add security headers to prevent XSS and CSRF attacks',
      codeSnippet: 'app.use(helmet({ contentSecurityPolicy: false }));'
    },
    {
      title: 'Scale Horizontally',
      description: 'Add more instances to handle increased load',
      codeSnippet: 'kubectl scale deployment auth-service --replicas=5'
    }
  ];
  
  return recommendations.map((rec, i) => ({
    id: `rec-${i + 1}`,
    title: rec.title,
    description: rec.description,
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    category: categories[Math.floor(Math.random() * categories.length)],
    codeSnippet: rec.codeSnippet,
    approved: Math.random() > 0.6
  }));
};

// Live data simulation hooks
export const useLiveData = <T>(generator: () => T[], interval: number = 5000) => {
  const [data, setData] = React.useState<T[]>(generator);
  
  React.useEffect(() => {
    const intervalId = setInterval(() => {
      setData(generator());
    }, interval);
    
    return () => clearInterval(intervalId);
  }, [generator, interval]);
  
  return data;
};

// Utility to add React import
import * as React from 'react';