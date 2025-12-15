import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RefreshCw, Check, X, Hammer, GitBranch, Terminal } from 'lucide-react';
import { apiService } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

type Fix = {
  issue?: string;
  description?: string;
  code_change?: string;
  files_to_modify?: string[];
};

interface FixSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  repoUrl?: string;
  initialLogs?: string;
}

export default function FixSidePanel({ isOpen, onClose, repoUrl = '', initialLogs = '' }: FixSidePanelProps) {
  const { toast } = useToast();
  const [logs, setLogs] = React.useState(initialLogs);
  const [url, setUrl] = React.useState(repoUrl);
  const [context, setContext] = React.useState('');
  const [fixes, setFixes] = React.useState<Fix[]>([]);
  const [selectedFixes, setSelectedFixes] = React.useState<Set<number>>(new Set());
  const [fixHistory, setFixHistory] = React.useState<Array<{timestamp: string; action: string; details: string}>>([]);
  const [edits, setEdits] = React.useState<Array<{ path: string; content: string }>>([]);
  const [deletes, setDeletes] = React.useState<string[]>([]);
  const [testCmd, setTestCmd] = React.useState('');
  const [analysisData, setAnalysisData] = React.useState<any>(null);
  const [showHistory, setShowHistory] = React.useState(false);

  const planMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { context };
      if (url.trim()) payload.github_url = url.trim();
      if (logs.trim()) payload.logs = logs.split('\n').filter(l => l.trim());
      // Use the proper autofix/plan endpoint
      return apiService.logs.autofixPlan(payload);
    },
    onSuccess: (data: any) => {
      console.log('Plan result:', data); // Debug log
      const suggested = (data as any)?.analysis?.suggested_fixes || (data as any)?.suggested_fixes || [];
      setFixes(suggested);
      setAnalysisData(data); // Store full analysis data
      
      // Add to history
      setFixHistory(prev => [{
        timestamp: new Date().toLocaleTimeString(),
        action: 'Plan Generated',
        details: `${suggested.length} fixes found`
      }, ...prev.slice(0, 9)]); // Keep last 10 entries
      
      // Show detailed analysis in toast
      const analysis = (data as any)?.analysis;
      let description = `${suggested.length} fixes suggested`;
      if (analysis?.log_analysis) {
        const logAnalysis = analysis.log_analysis;
        description += `. Found ${logAnalysis.summary?.error_count || 0} errors, ${logAnalysis.summary?.warning_count || 0} warnings.`;
      }
      
      toast({ 
        title: 'Plan generated successfully', 
        description,
        duration: 5000
      });
    },
    onError: (e: any) => {
      console.error('Plan error:', e);
      toast({ 
        title: 'Plan generation failed', 
        description: e.message || 'Failed to generate fix plan', 
        variant: 'destructive',
        duration: 7000
      });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      return fetch('/autofix/apply-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edits, deletes, test_command: testCmd || undefined }),
      }).then(r => r.json());
    },
    onSuccess: (data: any) => {
      toast({ title: 'Applied fixes', description: `Updated: ${(data.edits || []).filter((e: any) => e.status === 'updated').length}, Deleted: ${(data.deletes || []).filter((d: any) => d.status === 'deleted').length}` });
    },
    onError: (e: any) => toast({ title: 'Apply failed', description: e.message, variant: 'destructive' }),
  });

  const applyGitHubMutation = useMutation({
    mutationFn: async (createPR: boolean) => {
      if (!url.trim()) {
        throw new Error('GitHub URL is required');
      }
      return apiService.logs.autofixApplyGitHub({
        github_url: url.trim(),
        fixes: fixes,
        create_pr: createPR,
        target_branch: 'main',
        commit_message_prefix: 'Auto-fix:'
      });
    },
    onSuccess: (data: any) => {
      if (data.status === 'success' && data.pr_number) {
        setFixHistory(prev => [{
          timestamp: new Date().toLocaleTimeString(),
          action: 'PR Created',
          details: `PR #${data.pr_number} - ${url.split('/').slice(-2).join('/')}`
        }, ...prev.slice(0, 9)]);
        
        toast({ 
          title: 'Pull Request Created!', 
          description: `PR #${data.pr_number} created successfully. Check: ${data.pr_url}`,
          duration: 10000
        });
      } else if (data.status === 'success' && data.action === 'direct_commit') {
        setFixHistory(prev => [{
          timestamp: new Date().toLocaleTimeString(),
          action: 'Direct Commit',
          details: `${data.commits?.length || 0} files committed`
        }, ...prev.slice(0, 9)]);
        
        toast({ 
          title: 'Changes Committed!', 
          description: `${data.commits?.length || 0} files committed to ${data.branch}`
        });
      } else {
        toast({ 
          title: 'No changes applied', 
          description: data.message || 'No changes were made'
        });
      }
    },
    onError: (e: any) => toast({ title: 'GitHub apply failed', description: e.message, variant: 'destructive' }),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-16 bottom-0 w-full sm:w-[520px] bg-card border-l border-border z-50 overflow-auto">
      <div className="p-4 flex items-center justify-between sticky top-0 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          <span className="font-semibold">Auto-Fix Panel</span>
        </div>
        <Button variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="GitHub Repository URL (optional)" value={url} onChange={e => setUrl(e.target.value)} />
            <Textarea placeholder="Logs (optional)" value={logs} onChange={e => setLogs(e.target.value)} rows={4} className="font-mono text-sm" />
            <Input placeholder="Context (optional)" value={context} onChange={e => setContext(e.target.value)} />
            <Button onClick={() => planMutation.mutate()} disabled={planMutation.isPending}>
              {planMutation.isPending ? (<><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Planning...</>) : 'Generate Plan'}
            </Button>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {analysisData && analysisData.analysis && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysisData.analysis.log_analysis && (
                <div className="p-3 rounded-md bg-muted/20 border border-border">
                  <div className="text-sm font-semibold mb-2">Log Analysis</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <span className={`ml-2 font-medium ${
                        analysisData.analysis.log_analysis.status === 'ERROR' ? 'text-red-500' :
                        analysisData.analysis.log_analysis.status === 'WARN' ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {analysisData.analysis.log_analysis.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Severity:</span>
                      <span className="ml-2 font-medium">{analysisData.analysis.log_analysis.severity}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Errors:</span>
                      <span className="ml-2 font-medium text-red-500">
                        {analysisData.analysis.log_analysis.summary?.error_count || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Warnings:</span>
                      <span className="ml-2 font-medium text-yellow-500">
                        {analysisData.analysis.log_analysis.summary?.warning_count || 0}
                      </span>
                    </div>
                  </div>
                  {analysisData.analysis.log_analysis.root_cause && (
                    <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                      <span className="font-medium">Root Cause:</span>
                      <div className="mt-1">{analysisData.analysis.log_analysis.root_cause}</div>
                    </div>
                  )}
                  {analysisData.analysis.log_analysis.recommendations && 
                   analysisData.analysis.log_analysis.recommendations.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-medium mb-1">Recommendations:</div>
                      <ul className="list-disc list-inside text-xs space-y-1">
                        {analysisData.analysis.log_analysis.recommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="text-muted-foreground">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysisData.analysis.log_analysis.commands && 
                   analysisData.analysis.log_analysis.commands.length > 0 && (
                    <div className="mt-3 p-2 bg-blue-500/10 rounded border border-blue-500/20">
                      <div className="text-xs font-medium mb-2 flex items-center gap-1">
                        <Terminal className="h-3 w-3" />
                        Commands to Fix:
                      </div>
                      {analysisData.analysis.log_analysis.commands.map((cmd: string, idx: number) => (
                        <div key={idx} className="mt-1 p-2 bg-black/50 rounded">
                          <code className="text-xs text-green-400 font-mono">{cmd}</code>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(cmd);
                              toast({ title: 'Copied!', description: 'Command copied to clipboard' });
                            }}
                            className="ml-2 text-xs text-blue-400 hover:text-blue-300"
                          >
                            📋 Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {analysisData.analysis.log_analysis.code_fixes && 
                   analysisData.analysis.log_analysis.code_fixes.length > 0 && (
                    <div className="mt-3 p-2 bg-purple-500/10 rounded border border-purple-500/20">
                      <div className="text-xs font-medium mb-2">Code Fixes:</div>
                      {analysisData.analysis.log_analysis.code_fixes.map((fix: any, idx: number) => (
                        <div key={idx} className="mt-2 p-2 bg-muted/30 rounded">
                          <div className="text-xs font-medium">{fix.issue}</div>
                          <div className="text-xs text-muted-foreground mt-1">File: {fix.file}</div>
                          <div className="text-xs mt-1">{fix.fix}</div>
                          {fix.code && (
                            <pre className="text-xs mt-1 p-2 bg-black/50 rounded"><code className="text-green-400">{fix.code}</code></pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {analysisData.files_analyzed && analysisData.files_analyzed.length > 0 && (
                <div className="p-2 bg-blue-500/10 rounded text-xs">
                  <span className="font-medium">Files Analyzed:</span> {analysisData.files_analyzed.join(', ')}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Suggested Fixes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {fixes.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No fixes yet. Generate a plan first.
                {analysisData && !analysisData.analysis?.suggested_fixes?.length && (
                  <div className="mt-2 p-2 bg-yellow-500/10 rounded text-xs">
                    ℹ️ The analysis completed but no automated fixes were generated. This could mean:
                    <ul className="list-disc list-inside mt-1 ml-2">
                      <li>The logs don't contain specific error patterns</li>
                      <li>Manual review is recommended</li>
                      <li>Try providing more detailed logs or context</li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              fixes.map((f, i) => (
                <div key={i} className="p-3 rounded-md bg-muted/30 border border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm font-medium">{f.issue || f.description || `Fix #${i+1}`}</div>
                    {f.priority && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        f.priority === 'high' ? 'bg-red-500/20 text-red-500' :
                        f.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                        'bg-blue-500/20 text-blue-500'
                      }`}>
                        {f.priority}
                      </span>
                    )}
                  </div>
                  {f.description && f.description !== f.issue && (
                    <div className="text-xs text-muted-foreground mb-2">{f.description}</div>
                  )}
                  {f.code_change && (
                    <pre className="text-xs mt-2 p-2 bg-muted/50 overflow-auto rounded border"><code>{f.code_change}</code></pre>
                  )}
                  {f.files_to_modify && f.files_to_modify.length > 0 && (
                    <div className="text-xs mt-2 p-2 bg-blue-500/10 rounded">
                      <span className="font-medium">Files to modify:</span> {f.files_to_modify.join(', ')}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Apply to GitHub</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Apply suggested fixes directly to your GitHub repository. Requires a valid GitHub URL above.
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => applyGitHubMutation.mutate(true)} 
                disabled={applyGitHubMutation.isPending || (!fixes.length && !analysisData) || !url.trim()}
                className="flex-1"
                title={!url.trim() ? 'GitHub URL required' : !fixes.length && !analysisData ? 'Generate plan first' : 'Create PR with fixes'}
              >
                {applyGitHubMutation.isPending ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Creating PR...</>
                ) : (
                  <><GitBranch className="h-4 w-4 mr-2" />Create Pull Request</>
                )}
              </Button>
              <Button 
                onClick={() => applyGitHubMutation.mutate(false)} 
                disabled={applyGitHubMutation.isPending || (!fixes.length && !analysisData) || !url.trim()}
                variant="outline"
                className="flex-1"
                title={!url.trim() ? 'GitHub URL required' : !fixes.length && !analysisData ? 'Generate plan first' : 'Commit directly'}
              >
                {applyGitHubMutation.isPending ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Committing...</>
                ) : (
                  <><Check className="h-4 w-4 mr-2" />Direct Commit</>
                )}
              </Button>
            </div>
            {(!fixes.length && !analysisData) && url.trim() && (
              <div className="text-xs text-yellow-500 p-2 bg-yellow-500/10 rounded">
                ⚠️ Click "Generate Plan" first to analyze code and get fixes
              </div>
            )}
            {fixes.length === 0 && analysisData && (
              <div className="text-xs text-blue-500 p-2 bg-blue-500/10 rounded">
                ℹ️ Analysis complete. Commands and recommendations available above. PR will include analysis summary.
              </div>
            )}
            {applyGitHubMutation.data && (
              <div className="text-xs mt-2 p-3 rounded bg-muted">
                <div className="font-medium mb-1">Result:</div>
                <div className="space-y-1">
                  {(applyGitHubMutation.data as any).pr_url && (
                    <div>
                      PR: <a href={(applyGitHubMutation.data as any).pr_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                        #{(applyGitHubMutation.data as any).pr_number}
                      </a>
                    </div>
                  )}
                  {(applyGitHubMutation.data as any).commits && (
                    <div>Commits: {(applyGitHubMutation.data as any).commits.length}</div>
                  )}
                  {(applyGitHubMutation.data as any).message && (
                    <div>{(applyGitHubMutation.data as any).message}</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fix History */}
        {fixHistory.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Fix History</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
                  {showHistory ? 'Hide' : 'Show'}
                </Button>
              </div>
            </CardHeader>
            {showHistory && (
              <CardContent>
                <div className="space-y-2">
                  {fixHistory.map((entry, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs p-2 rounded-md bg-muted/30">
                      <div className="text-muted-foreground min-w-[60px]">{entry.timestamp}</div>
                      <div className="flex-1">
                        <div className="font-medium">{entry.action}</div>
                        <div className="text-muted-foreground">{entry.details}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Apply Locally (Advanced)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">Provide concrete edits to apply. Each edit overwrites the target file content.</div>
            <Textarea
              placeholder={"JSON edits array, e.g.\n[\n  {\n    \"path\": \"deploy-drift-main/src/lib/api.ts\",\n    \"content\": \"...new file content...\"\n  }\n]"}
              value={JSON.stringify(edits, null, 2)}
              onChange={(e) => {
                try { setEdits(JSON.parse(e.target.value || '[]')); } catch { /* ignore */ }
              }}
              rows={6}
              className="font-mono text-xs"
            />
            <Input
              placeholder="Comma-separated file paths to delete (optional)"
              onChange={(e) => setDeletes(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            />
            <Input placeholder="Test command (optional), e.g., npm test -w deploy-drift-main" value={testCmd} onChange={e => setTestCmd(e.target.value)} />
            <Button onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}>
              {applyMutation.isPending ? (<><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Applying...</>) : (<><Hammer className="h-4 w-4 mr-2" />Apply Fixes</>)}
            </Button>
            {applyMutation.data && (
              <div className="text-xs mt-2">
                <div className="mb-1">Edits: {JSON.stringify((applyMutation.data as any).edits)}</div>
                <div className="mb-1">Deletes: {JSON.stringify((applyMutation.data as any).deletes)}</div>
                <div>Test: {JSON.stringify((applyMutation.data as any).test)}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}







