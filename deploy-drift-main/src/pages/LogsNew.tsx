import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/StatusBadge';
import { apiService } from '@/lib/api';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, Upload, AlertCircle, CheckCircle, Clock, RefreshCw, Wand2, Github } from 'lucide-react';
import FixSidePanel from '@/components/FixSidePanel';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  service: string;
  message: string;
  metadata?: any;
}

interface LogAnalysisResult {
  status: string;
  analysis: {
    total_entries: number;
    errors_found: number;
    warnings_found: number;
    critical_issues: number;
    severity_level: string;
    patterns_detected: string[];
    recommendations: string[];
    confidence_score: number;
    ai_insights: string;
  };
  processing_time: string;
  timestamp: string;
}

export default function Logs() {
  const { toast } = useToast();
  const [logInput, setLogInput] = React.useState('');
  const [serviceInput, setServiceInput] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedLevel, setSelectedLevel] = React.useState<string>('all');
  const [analysisResult, setAnalysisResult] = React.useState<LogAnalysisResult | null>(null);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [repoUrl, setRepoUrl] = React.useState(''); // Kept for Auto-Fix Panel

  // Fetch recent logs from API
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs, error: logsError } = useQuery({
    queryKey: ['recent-logs', selectedLevel],
    queryFn: () => apiService.logs.getRecent(50, selectedLevel === 'all' ? undefined : selectedLevel),
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: 3,
  });

  // Search logs mutation
  const searchMutation = useMutation({
    mutationFn: (query: string) => apiService.logs.search(query, 20),
    onSuccess: (data) => {
      toast({
        title: "Search completed",
        description: `Found ${(data as any).total_matches} matches`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Log analysis mutation
  const analysisMutation = useMutation({
    mutationFn: ({ logs, service }: { logs: string[], service?: string }) => 
      apiService.logs.analyze(logs, service),
    onSuccess: (data) => {
      setAnalysisResult(data as LogAnalysisResult);
      toast({
        title: "Analysis completed",
        description: "AI analysis results are ready",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // These features are replaced by the Auto-Fix Panel which provides:
  // - Better UI/UX with side panel
  // - Real GitHub integration
  // - Code fix generation and preview
  // - Batch apply functionality

  const logs = (logsData as any)?.logs as LogEntry[] || [];
  const searchResults = searchMutation.data as any;
  const displayLogs = searchResults?.results || logs;

  const handleSearch = () => {
    if (searchTerm.trim()) {
      searchMutation.mutate(searchTerm);
    } else {
      refetchLogs();
    }
  };

  const handleAnalyzeLogs = () => {
    if (!logInput.trim()) {
      toast({
        title: "No logs to analyze",
        description: "Please paste some logs to analyze",
        variant: "destructive",
      });
      return;
    }

    const logLines = logInput.split('\n').filter(line => line.trim());
    analysisMutation.mutate({
      logs: logLines,
      service: serviceInput.trim() || undefined
    });
  };

  const handleLoadSampleLogs = () => {
    const sampleLogs = `2024-01-15 10:30:25 ERROR [DatabaseService] Connection timeout after 30s
2024-01-15 10:30:26 ERROR [DatabaseService] Connection pool exhausted, max connections: 20
2024-01-15 10:30:27 WARN [AuthService] Multiple failed login attempts from IP: 192.168.1.100
2024-01-15 10:30:28 ERROR [APIGateway] Request failed with status 500: Internal Server Error
2024-01-15 10:30:29 INFO [CacheService] Cache miss for key: user_profile_12345
2024-01-15 10:30:30 ERROR [PaymentService] Payment processing failed: Card declined
2024-01-15 10:30:31 WARN [SecurityService] Suspicious activity detected from user: user_67890`;
    
    setLogInput(sampleLogs);
    setServiceInput('deployment-service');
  };

  const getLogLevelVariant = (level: string): 'success' | 'warning' | 'error' | 'pending' | 'info' => {
    switch (level.toUpperCase()) {
      case 'ERROR': return 'error';
      case 'WARN': case 'WARNING': return 'warning';
      case 'INFO': return 'info';
      case 'DEBUG': return 'pending';
      default: return 'info';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        month: 'short',
        day: 'numeric'
      }).format(new Date(timestamp));
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Log Analysis</h1>
        <p className="text-muted-foreground">AI-powered log analysis and monitoring</p>
      </div>

      {/* Log Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Analyze Logs with AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Log Data</label>
              <Textarea
                placeholder="Paste your logs here..."
                value={logInput}
                onChange={(e) => setLogInput(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              <div className="text-center p-8 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border-2 border-dashed border-primary/20">
                <Github className="h-16 w-16 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-bold mb-2">AI-Powered Auto-Fix</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Connect your GitHub repository, analyze logs, and automatically generate code fixes with pull requests
                </p>
                <Button
                  size="lg"
                  onClick={() => setPanelOpen(true)}
                  className="shadow-lg"
                >
                  <Wand2 className="h-5 w-5 mr-2" />
                  Open Auto-Fix Panel
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Service Name (Optional)</label>
                <Input
                  placeholder="e.g., api-gateway, database"
                  value={serviceInput}
                  onChange={(e) => setServiceInput(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Button 
                  onClick={handleAnalyzeLogs} 
                  disabled={analysisMutation.isPending}
                  className="w-full"
                >
                  {analysisMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Analyze with AI
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleLoadSampleLogs} 
                  variant="outline"
                  className="w-full"
                >
                  Load Sample Logs
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <FixSidePanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} repoUrl={repoUrl} initialLogs={logInput} />

      {/* Analysis Results */}
      {analysisResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{analysisResult.analysis.total_entries}</div>
                  <div className="text-sm text-muted-foreground">Total Entries</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-destructive">{analysisResult.analysis.errors_found}</div>
                  <div className="text-sm text-muted-foreground">Errors Found</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-warning">{analysisResult.analysis.warnings_found}</div>
                  <div className="text-sm text-muted-foreground">Warnings</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-info">{(analysisResult.analysis.confidence_score * 100).toFixed(0)}%</div>
                  <div className="text-sm text-muted-foreground">Confidence</div>
                </div>
              </div>

              {/* Severity */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Severity Level:</span>
                <StatusBadge status={analysisResult.analysis.severity_level === 'high' ? 'error' : 
                                   analysisResult.analysis.severity_level === 'medium' ? 'warning' : 'info'}>
                  {analysisResult.analysis.severity_level.toUpperCase()}
                </StatusBadge>
              </div>

              {/* AI Insights */}
              <div>
                <h4 className="font-medium mb-2">AI Insights</h4>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  {analysisResult.analysis.ai_insights}
                </p>
              </div>

              {/* Patterns Detected */}
              {analysisResult.analysis.patterns_detected.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Patterns Detected</h4>
                  <ul className="space-y-1">
                    {analysisResult.analysis.patterns_detected.map((pattern, index) => (
                      <li key={index} className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-warning" />
                        {pattern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {analysisResult.analysis.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Recommendations</h4>
                  <ul className="space-y-1">
                    {analysisResult.analysis.recommendations.map((recommendation, index) => (
                      <li key={index} className="text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Processing Time */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Processing time: {analysisResult.processing_time}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Log Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="all">All Levels</option>
              <option value="error">ERROR</option>
              <option value="warning">WARNING</option>
              <option value="info">INFO</option>
              <option value="debug">DEBUG</option>
            </select>
            <Button 
              onClick={handleSearch} 
              disabled={searchMutation.isPending}
            >
              {searchMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Logs</span>
            <Button onClick={() => refetchLogs()} variant="outline" size="sm" disabled={logsLoading}>
              <RefreshCw className={`h-4 w-4 ${logsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="text-center py-8">Loading logs...</div>
          ) : logsError ? (
            <div className="text-center py-8 text-red-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              Error loading logs. Make sure the backend is running.
            </div>
          ) : displayLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No logs found</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {displayLogs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <StatusBadge status={getLogLevelVariant(log.level)}>
                    {log.level}
                  </StatusBadge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{log.service}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm font-mono break-all">{log.message}</p>
                    {log.metadata && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {JSON.stringify(log.metadata)}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}