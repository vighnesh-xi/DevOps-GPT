"""
Simple DevOps-GPT API - Log Analysis with Mistral AI
"""

import os
import logging
import re
import json
from datetime import datetime
from typing import List, Dict, Any, Optional, Union
import asyncio

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, validator, ValidationError
import uvicorn

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import Mistral AI
try:
    from mistralai.client import MistralClient
    from mistralai.models.chat_completion import ChatMessage
    MISTRAL_AVAILABLE = True
    logger.info("✅ Mistral AI package imported successfully")
except ImportError as e:
    MISTRAL_AVAILABLE = False
    logger.warning("⚠️  mistralai package not found. Install with: pip install mistralai")

# Check for API key
MISTRAL_API_KEY = os.getenv('MISTRAL_API_KEY')
if not MISTRAL_API_KEY:
    logger.warning("⚠️  MISTRAL_API_KEY not found in environment variables")
    logger.info("💡 To use real AI analysis:")
    logger.info("   1. Get API key from https://console.mistral.ai/")
    logger.info("   2. Set environment variable: export MISTRAL_API_KEY=your_key_here")
    logger.info("   3. Or create .env file with: MISTRAL_API_KEY=your_key_here")
    logger.info("🔄 Running in mock mode for now")
else:
    logger.info("✅ MISTRAL_API_KEY found - AI analysis enabled")

# Real Mistral AI Agent
class MistralAgent:
    def __init__(self):
        self.client = None
        self.mock_mode = True
        
        # Check if Mistral is available and configured
        if MISTRAL_AVAILABLE and MISTRAL_API_KEY and MISTRAL_API_KEY != "your_actual_mistral_api_key_here":
            try:
                self.client = MistralClient(api_key=MISTRAL_API_KEY)
                self.mock_mode = False
                logger.info("🤖 Mistral AI client initialized successfully")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Mistral client: {e}")
                self.mock_mode = True
        else:
            if not MISTRAL_AVAILABLE:
                logger.info("📦 Mistral package not installed - using mock mode")
            elif not MISTRAL_API_KEY:
                logger.info("🔑 No API key provided - using mock mode")
            else:
                logger.info("🔧 Default API key detected - using mock mode")
    
    async def analyze_logs(self, logs: List[str], context: str = None) -> Dict[str, Any]:
        """Analyze logs using Mistral AI or enhanced pattern matching"""
        
        if self.mock_mode:
            logger.info("🎭 Using enhanced pattern matching (mock mode)")
            return self._enhanced_pattern_analysis(logs, context)  # Remove await here
        
        try:
            logger.info("🧠 Using Mistral AI for analysis")
            
            # Prepare logs for AI analysis
            logs_text = "\n".join(logs[:50])  # Limit to 50 lines for API efficiency
            
            prompt = f"""
            Analyze these logs and provide detailed insights:
            
            Context: {context or "Log analysis"}
            
            Logs:
            {logs_text}
            
            Please provide a comprehensive analysis in JSON format with:
            1. log_type: "security", "web", "application", "system", or "general"
            2. status: "HEALTHY", "WARNING", "ERROR", or "CRITICAL"
            3. severity: "LOW", "MEDIUM", or "HIGH"
            4. confidence: percentage (0-100)
            5. summary: brief description of findings
            6. issues_detected: array of specific issues found
            7. recommendations: array of specific actions to take
            8. technical_fixes: array of commands or configuration changes
            
            Focus on identifying the log type and providing relevant analysis for:
            - Security logs: authentication failures, brute force attacks, unauthorized access
            - Web logs: HTTP errors, performance issues, traffic patterns
            - Application logs: deployment failures, API errors, database issues
            - System logs: service failures, resource problems, kernel issues
            """
            
            messages = [ChatMessage(role="user", content=prompt)]
            
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.client.chat(
                    model=os.getenv('MISTRAL_MODEL', 'mistral-tiny'),
                    messages=messages,
                    temperature=0.1,
                    max_tokens=2048
                )
            )
            
            # Try to parse JSON response
            try:
                result = json.loads(response.choices[0].message.content)
                result["analysis_method"] = "mistral-ai"
                result["processed_logs"] = len(logs)
                return result
            except json.JSONDecodeError:
                # If AI doesn't return valid JSON, parse the text response
                return self._parse_ai_text_response(response.choices[0].message.content, logs)
                
        except Exception as e:
            logger.error(f"❌ Mistral AI analysis failed: {e}")
            logger.info("🔄 Falling back to enhanced pattern matching")
            return self._enhanced_pattern_analysis(logs, context)  # Remove await here
    
    def _parse_ai_text_response(self, ai_response: str, logs: List[str]) -> Dict[str, Any]:
        """Parse AI text response when JSON parsing fails"""
        
        # Basic extraction from text response
        status = "WARNING"
        if "CRITICAL" in ai_response.upper():
            status = "CRITICAL"
        elif "ERROR" in ai_response.upper():
            status = "ERROR"
        elif "HEALTHY" in ai_response.upper():
            status = "HEALTHY"
        
        severity = "MEDIUM"
        if "HIGH" in ai_response:
            severity = "HIGH"
        elif "LOW" in ai_response:
            severity = "LOW"
        
        # Extract recommendations (lines that look like recommendations)
        recommendations = []
        for line in ai_response.split('\n'):
            if any(keyword in line.lower() for keyword in ['recommend', 'should', 'consider', 'fix', 'check']):
                recommendations.append(line.strip())
        
        return {
            "status": status,
            "severity": severity,
            "confidence": 0.7,
            "summary": {
                "total_logs": len(logs),
                "error_count": sum(1 for log in logs if any(err in log.upper() for err in ['ERROR', 'FAILED', 'EXCEPTION'])),
                "warning_count": sum(1 for log in logs if 'WARNING' in log.upper()),
                "critical_issues": sum(1 for log in logs if any(crit in log.upper() for crit in ['CRITICAL', 'FATAL']))
            },
            "issues": {
                "critical": [line for line in logs if any(crit in line.upper() for crit in ['CRITICAL', 'FATAL'])][:3],
                "errors": [line for line in logs if any(err in line.upper() for err in ['ERROR', 'FAILED'])][:3],
                "warnings": [line for line in logs if 'WARNING' in line.upper()][:3]
            },
            "root_cause": "Analysis based on AI text parsing",
            "recommendations": recommendations[:5] if recommendations else ["Check logs for errors and warnings"],
            "fixes": ["Review error messages and apply appropriate fixes"],
            "analysis_method": "mistral-ai-text-parsing",
            "timestamp": datetime.now().isoformat()
        }
    
    def _enhanced_pattern_analysis(self, logs: List[str], context: str = None) -> Dict[str, Any]:
        """Enhanced pattern matching analysis for multiple log types - NOT async"""
        
        # Detect log type first
        log_type = self._detect_log_type(logs, context)
        
        # General patterns that apply to all log types
        general_patterns = {
            'error_patterns': [
                r"ERROR|FATAL|CRITICAL|ALERT|FAIL",
                r"failed|Failed|FAILED|failure",
                r"timeout|Timeout|TIMEOUT",
                r"exception|Exception|EXCEPTION",
                r"out of memory|OutOfMemoryError",
                r"connection refused|connection reset",
                r"port.*already in use",
                r"bind.*address already in use",
                r"exited abnormally|crashed|panic",
                r"stack trace|stacktrace",
                r"null pointer|segmentation fault"
            ],
            'warning_patterns': [
                r"WARNING|WARN",
                r"deprecated|Deprecated",
                r"high memory usage|memory leak",
                r"slow response|performance",
                r"retry|retrying|attempting",
                r"disk space|storage full"
            ],
            'info_patterns': [
                r"INFO|INFORMATION",
                r"started|starting|initialized",
                r"completed|finished|success",
                r"connected|connection established"
            ]
        }
        
        # Specific patterns based on log type
        specific_patterns = self._get_specific_patterns(log_type)
        
        # Analyze logs with enhanced detection
        analysis_results = {
            'total_logs': len(logs),
            'log_type': log_type,
            'error_count': 0,
            'warning_count': 0,
            'info_count': 0,
            'critical_issues': [],
            'error_issues': [],
            'warning_issues': [],
            'info_issues': [],
            'type_specific_issues': {}
        }
        
        # Add type-specific counters
        if log_type == 'security':
            analysis_results.update({
                'security_events': 0,
                'auth_failures': 0,
                'brute_force_attempts': 0,
                'unknown_users': 0,
                'suspicious_ips': set(),
                'root_attempts': 0,
                'security_issues': [],
                'suspicious_activities': []
            })
        elif log_type == 'application':
            analysis_results.update({
                'deployment_issues': 0,
                'performance_issues': 0,
                'database_issues': 0,
                'api_errors': 0
            })
        elif log_type == 'system':
            analysis_results.update({
                'resource_issues': 0,
                'service_failures': 0,
                'disk_issues': 0,
                'network_issues': 0
            })
        elif log_type == 'web':
            analysis_results.update({
                'http_errors': 0,
                '4xx_errors': 0,
                '5xx_errors': 0,
                'slow_requests': 0
            })
        
        for log in logs:
            # General pattern analysis
            if any(re.search(pattern, log, re.IGNORECASE) for pattern in general_patterns['error_patterns']):
                analysis_results['error_count'] += 1
                if any(crit in log.upper() for crit in ['CRITICAL', 'FATAL', 'ALERT']):
                    analysis_results['critical_issues'].append(log)
                else:
                    analysis_results['error_issues'].append(log)
            
            elif any(re.search(pattern, log, re.IGNORECASE) for pattern in general_patterns['warning_patterns']):
                analysis_results['warning_count'] += 1
                analysis_results['warning_issues'].append(log)
            
            elif any(re.search(pattern, log, re.IGNORECASE) for pattern in general_patterns['info_patterns']):
                analysis_results['info_count'] += 1
                analysis_results['info_issues'].append(log)
            
            # Type-specific analysis
            self._analyze_log_by_type(log, log_type, specific_patterns, analysis_results)
        
        # Determine status based on analysis
        status, severity = self._determine_status(analysis_results, log_type)
        
        # Generate recommendations and fixes
        recommendations, fixes = self._generate_recommendations(analysis_results, log_type)
        
        # Create root cause analysis
        root_cause = self._create_root_cause(analysis_results, log_type)
        
        return {
            "status": status,
            "severity": severity,
            "confidence": 0.9,
            "log_type": log_type,
            "summary": self._create_summary(analysis_results),
            "issues": self._format_issues(analysis_results),
            "root_cause": root_cause,
            "recommendations": recommendations,
            "fixes": fixes,
            "type_specific_analysis": self._create_type_specific_analysis(analysis_results, log_type),
            "analysis_method": f"enhanced_{log_type}_pattern_matching",
            "timestamp": datetime.now().isoformat(),
            "context": context or f"{log_type.title()} log analysis"
        }
    
    def _detect_log_type(self, logs: List[str], context: str = None) -> str:
        """Detect the type of logs based on patterns and context"""
        if context:
            context_lower = context.lower()
            if any(keyword in context_lower for keyword in ['security', 'auth', 'ssh', 'login']):
                return 'security'
            elif any(keyword in context_lower for keyword in ['web', 'http', 'nginx', 'apache']):
                return 'web'
            elif any(keyword in context_lower for keyword in ['app', 'application', 'deploy']):
                return 'application'
            elif any(keyword in context_lower for keyword in ['system', 'kernel', 'service']):
                return 'system'
        
        # Analyze log content to determine type
        security_indicators = 0
        web_indicators = 0
        app_indicators = 0
        system_indicators = 0
        
        for log in logs[:20]:  # Check first 20 logs for patterns
            log_lower = log.lower()
            
            # Security patterns
            if any(pattern in log_lower for pattern in ['sshd', 'authentication', 'login', 'password', 'security']):
                security_indicators += 1
            
            # Web server patterns
            if any(pattern in log for pattern in ['GET', 'POST', 'HTTP', '200', '404', '500']) or \
               re.search(r'\d+\.\d+\.\d+\.\d+', log):
                web_indicators += 1
            
            # Application patterns
            if any(pattern in log_lower for pattern in ['deploy', 'container', 'docker', 'kubernetes', 'application']):
                app_indicators += 1
            
            # System patterns
            if any(pattern in log_lower for pattern in ['kernel', 'systemd', 'service', 'daemon', 'process']):
                system_indicators += 1
        
        # Return type with highest indicators
        max_indicators = max(security_indicators, web_indicators, app_indicators, system_indicators)
        
        if max_indicators == 0:
            return 'general'
        elif security_indicators == max_indicators:
            return 'security'
        elif web_indicators == max_indicators:
            return 'web'
        elif app_indicators == max_indicators:
            return 'application'
        else:
            return 'system'
    
    def _get_specific_patterns(self, log_type: str) -> Dict[str, Any]:
        """Get specific patterns for different log types"""
        patterns = {}
        
        if log_type == 'security':
            patterns = {
                'ssh_auth_failure': r'sshd.*authentication failure',
                'brute_force': r'authentication failure.*rhost=',
                'unknown_user': r'check pass; user unknown',
                'failed_login': r'Failed password|Invalid user',
                'suspicious_ip': r'rhost=[\d\.\-\w]+',
                'root_access': r'user=root',
                'session_activity': r'session (opened|closed) for user'
            }
        elif log_type == 'web':
            patterns = {
                'http_error': r'HTTP/\d\.\d\"\s+[45]\d\d',
                '4xx_error': r'HTTP/\d\.\d\"\s+4\d\d',
                '5xx_error': r'HTTP/\d\.\d\"\s+5\d\d',
                'slow_request': r'request_time|response_time.*[1-9]\d{3,}',
                'high_traffic': r'flood|ddos|rate.limit'
            }
        elif log_type == 'application':
            patterns = {
                'deployment_error': r'deploy|container.*failed|image.*pull.*error',
                'database_error': r'database|sql|connection.*pool|deadlock',
                'api_error': r'api.*error|endpoint.*failed|service.*unavailable',
                'performance_issue': r'slow.*query|timeout|memory.*leak'
            }
        elif log_type == 'system':
            patterns = {
                'service_failure': r'systemd|service.*failed|daemon.*error',
                'resource_issue': r'out.*of.*memory|disk.*full|cpu.*usage',
                'network_issue': r'network.*unreachable|dns.*error|connection.*refused',
                'kernel_issue': r'kernel.*panic|segfault|oops'
            }
        
        return patterns
    
    def _analyze_log_by_type(self, log: str, log_type: str, patterns: Dict[str, Any], results: Dict[str, Any]):
        """Analyze a single log line based on its type"""
        
        if log_type == 'security':
            if re.search(patterns.get('ssh_auth_failure', ''), log, re.IGNORECASE):
                results['auth_failures'] += 1
                results['security_events'] += 1
                results['security_issues'].append(log)
                
                ip_match = re.search(r'rhost=([\d\.\-\w]+)', log)
                if ip_match:
                    results['suspicious_ips'].add(ip_match.group(1))
                
                if re.search(r'user=root', log):
                    results['root_attempts'] += 1
            
            elif re.search(patterns.get('unknown_user', ''), log, re.IGNORECASE):
                results['unknown_users'] += 1
                results['security_events'] += 1
                results['suspicious_activities'].append(log)
        
        elif log_type == 'web':
            if re.search(patterns.get('4xx_error', ''), log):
                results['4xx_errors'] += 1
                results['http_errors'] += 1
            elif re.search(patterns.get('5xx_error', ''), log):
                results['5xx_errors'] += 1
                results['http_errors'] += 1
            elif re.search(patterns.get('slow_request', ''), log):
                results['slow_requests'] += 1
        
        elif log_type == 'application':
            if re.search(patterns.get('deployment_error', ''), log, re.IGNORECASE):
                results['deployment_issues'] += 1
            elif re.search(patterns.get('database_error', ''), log, re.IGNORECASE):
                results['database_issues'] += 1
            elif re.search(patterns.get('api_error', ''), log, re.IGNORECASE):
                results['api_errors'] += 1
            elif re.search(patterns.get('performance_issue', ''), log, re.IGNORECASE):
                results['performance_issues'] += 1
        
        elif log_type == 'system':
            if re.search(patterns.get('service_failure', ''), log, re.IGNORECASE):
                results['service_failures'] += 1
            elif re.search(patterns.get('resource_issue', ''), log, re.IGNORECASE):
                results['resource_issues'] += 1
            elif re.search(patterns.get('network_issue', ''), log, re.IGNORECASE):
                results['network_issues'] += 1
    
    def _determine_status(self, results: Dict[str, Any], log_type: str) -> tuple:
        """Determine status and severity based on analysis results"""
        
        if results['critical_issues']:
            return "CRITICAL", "HIGH"
        
        if log_type == 'security':
            if results.get('brute_force_attempts', 0) > 0 or results.get('auth_failures', 0) >= 10:
                return "CRITICAL", "HIGH"
            elif results.get('auth_failures', 0) >= 3 or results.get('unknown_users', 0) >= 3:
                return "ERROR", "MEDIUM"
        
        elif log_type == 'web':
            if results.get('5xx_errors', 0) >= 10:
                return "CRITICAL", "HIGH"
            elif results.get('5xx_errors', 0) > 0 or results.get('4xx_errors', 0) >= 20:
                return "ERROR", "MEDIUM"
        
        elif log_type == 'application':
            if results.get('deployment_issues', 0) > 0:
                return "ERROR", "MEDIUM"
            elif results.get('database_issues', 0) > 0:
                return "ERROR", "MEDIUM"
        
        elif log_type == 'system':
            if results.get('service_failures', 0) > 0:
                return "ERROR", "MEDIUM"
            elif results.get('resource_issues', 0) > 0:
                return "WARNING", "MEDIUM"
        
        if results['error_count'] > 0:
            return "ERROR", "MEDIUM"
        elif results['warning_count'] > 0:
            return "WARNING", "LOW"
        else:
            return "HEALTHY", "LOW"
    
    def _generate_recommendations(self, results: Dict[str, Any], log_type: str) -> tuple:
        """Generate recommendations and fixes based on log type and issues"""
        recommendations = []
        fixes = []
        
        if log_type == 'security':
            if results.get('auth_failures', 0) >= 5:
                recommendations.extend([
                    "🔐 High number of authentication failures detected",
                    "🚨 Possible brute force attack in progress"
                ])
                fixes.extend([
                    "Configure fail2ban: sudo apt-get install fail2ban",
                    "Disable password authentication, use SSH keys",
                    "Change default SSH port from 22"
                ])
            
            if results.get('suspicious_ips'):
                recommendations.append(f"🛡️ Block suspicious IPs: {list(results['suspicious_ips'])[:3]}")
                fixes.append("Block IPs with iptables or firewall rules")
        
        elif log_type == 'web':
            if results.get('5xx_errors', 0) > 0:
                recommendations.extend([
                    "🔴 Server errors detected - check application health",
                    "📊 Monitor application performance and resources"
                ])
                fixes.extend([
                    "Check application logs for detailed errors",
                    "Restart application services if needed",
                    "Verify database connectivity"
                ])
            
            if results.get('slow_requests', 0) > 0:
                recommendations.append("⚡ Slow requests detected - optimize performance")
                fixes.extend([
                    "Analyze slow query logs",
                    "Add caching layers",
                    "Optimize database queries"
                ])
        
        elif log_type == 'application':
            if results.get('deployment_issues', 0) > 0:
                recommendations.extend([
                    "🚀 Deployment issues detected",
                    "🔄 Check container and service configurations"
                ])
                fixes.extend([
                    "Verify image availability and versions",
                    "Check resource allocations",
                    "Review deployment scripts"
                ])
            
            if results.get('database_issues', 0) > 0:
                recommendations.append("🗄️ Database connectivity issues")
                fixes.extend([
                    "Check database service status",
                    "Verify connection strings",
                    "Monitor database performance"
                ])
        
        elif log_type == 'system':
            if results.get('service_failures', 0) > 0:
                recommendations.append("⚙️ System service failures detected")
                fixes.extend([
                    "Check service status: systemctl status <service>",
                    "Review service logs: journalctl -u <service>",
                    "Restart failed services if needed"
                ])
            
            if results.get('resource_issues', 0) > 0:
                recommendations.append("📈 System resource issues detected")
                fixes.extend([
                    "Check disk space: df -h",
                    "Monitor memory usage: free -h",
                    "Check CPU usage: top or htop"
                ])
        
        # General recommendations
        if results['error_count'] > 0:
            recommendations.append("⚠️ System errors require attention")
            fixes.extend([
                "Review error logs for patterns",
                "Check system health and resources"
            ])
        
        if not recommendations:
            recommendations.append("✅ No critical issues detected")
            fixes.append("Continue monitoring system health")
        
        return recommendations, fixes
    
    def _create_root_cause(self, results: Dict[str, Any], log_type: str) -> str:
        """Create root cause analysis based on log type and issues"""
        causes = []
        
        if log_type == 'security':
            if results.get('auth_failures', 0) > 0:
                causes.append(f"{results['auth_failures']} authentication failures")
            if results.get('suspicious_ips'):
                causes.append(f"Suspicious activity from {len(results['suspicious_ips'])} IPs")
        
        elif log_type == 'web':
            if results.get('5xx_errors', 0) > 0:
                causes.append(f"{results['5xx_errors']} server errors")
            if results.get('4xx_errors', 0) > 0:
                causes.append(f"{results['4xx_errors']} client errors")
        
        elif log_type == 'application':
            if results.get('deployment_issues', 0) > 0:
                causes.append(f"{results['deployment_issues']} deployment issues")
            if results.get('database_issues', 0) > 0:
                causes.append(f"{results['database_issues']} database problems")
        
        elif log_type == 'system':
            if results.get('service_failures', 0) > 0:
                causes.append(f"{results['service_failures']} service failures")
            if results.get('resource_issues', 0) > 0:
                causes.append(f"{results['resource_issues']} resource problems")
        
        if results['error_count'] > 0:
            causes.append(f"{results['error_count']} general errors")
        
        return "; ".join(causes) if causes else f"Normal {log_type} activity patterns"
    
    def _create_summary(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Create summary based on analysis results"""
        summary = {
            "total_logs": results['total_logs'],
            "log_type": results['log_type'],
            "error_count": results['error_count'],
            "warning_count": results['warning_count'],
            "info_count": results['info_count'],
            "critical_issues": len(results['critical_issues'])
        }
        
        # Add type-specific metrics
        if results['log_type'] == 'security':
            summary.update({
                "security_events": results.get('security_events', 0),
                "auth_failures": results.get('auth_failures', 0),
                "suspicious_ips": len(results.get('suspicious_ips', set()))
            })
        elif results['log_type'] == 'web':
            summary.update({
                "http_errors": results.get('http_errors', 0),
                "4xx_errors": results.get('4xx_errors', 0),
                "5xx_errors": results.get('5xx_errors', 0)
            })
        elif results['log_type'] == 'application':
            summary.update({
                "deployment_issues": results.get('deployment_issues', 0),
                "database_issues": results.get('database_issues', 0),
                "api_errors": results.get('api_errors', 0)
            })
        elif results['log_type'] == 'system':
            summary.update({
                "service_failures": results.get('service_failures', 0),
                "resource_issues": results.get('resource_issues', 0),
                "network_issues": results.get('network_issues', 0)
            })
        
        return summary
    
    def _format_issues(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Format issues for output"""
        issues = {
            "critical": results['critical_issues'][:3],
            "errors": results['error_issues'][:3],
            "warnings": results['warning_issues'][:3]
        }
        
        # Add type-specific issues
        if results['log_type'] == 'security':
            issues["security"] = results.get('security_issues', [])[:5]
            issues["suspicious_ips"] = list(results.get('suspicious_ips', set()))[:10]
        
        return issues
    
    def _create_type_specific_analysis(self, results: Dict[str, Any], log_type: str) -> Dict[str, Any]:
        """Create type-specific analysis section"""
        
        if log_type == 'security':
            return {
                "threat_level": "HIGH" if results.get('auth_failures', 0) >= 10 else "MEDIUM" if results.get('auth_failures', 0) > 0 else "LOW",
                "attack_vectors": ["Brute Force"] if results.get('auth_failures', 0) >= 5 else [],
                "affected_services": ["SSH/SSHD"] if results.get('auth_failures', 0) > 0 else []
            }
        elif log_type == 'web':
            return {
                "availability": "DOWN" if results.get('5xx_errors', 0) >= 10 else "DEGRADED" if results.get('5xx_errors', 0) > 0 else "UP",
                "performance": "SLOW" if results.get('slow_requests', 0) > 0 else "NORMAL",
                "error_rate": f"{(results.get('http_errors', 0) / max(results['total_logs'], 1)) * 100:.1f}%"
            }
        elif log_type == 'application':
            return {
                "deployment_status": "FAILED" if results.get('deployment_issues', 0) > 0 else "SUCCESS",
                "database_health": "ISSUES" if results.get('database_issues', 0) > 0 else "HEALTHY",
                "api_status": "ERRORS" if results.get('api_errors', 0) > 0 else "NORMAL"
            }
        elif log_type == 'system':
            return {
                "service_health": "DEGRADED" if results.get('service_failures', 0) > 0 else "HEALTHY",
                "resource_status": "CRITICAL" if results.get('resource_issues', 0) > 0 else "NORMAL",
                "network_status": "ISSUES" if results.get('network_issues', 0) > 0 else "STABLE"
            }
        else:
            return {
                "general_health": "ISSUES" if results['error_count'] > 0 else "HEALTHY"
            }


# Initialize the AI agent
mistral_agent = MistralAgent()

# Pydantic Models
class LogAnalysisRequest(BaseModel):
    logs: Union[List[str], str]
    context: Optional[str] = None
    
    @validator('logs', pre=True)
    def validate_logs(cls, v):
        def clean_log_line(line):
            """Clean a log line - be very permissive for real-world logs"""
            if not isinstance(line, str):
                line = str(line)
            
            # Be very permissive - only remove truly problematic control chars
            cleaned = ''
            for char in line:
                char_code = ord(char)
                # Remove only NULL and other problematic control chars, keep most everything else
                if char_code == 0 or (1 <= char_code <= 8) or (14 <= char_code <= 31 and char not in ['\t', '\n', '\r']):
                    cleaned += ' '  # Replace with space
                else:
                    cleaned += char
            
            return cleaned.strip()
        
        try:
            if isinstance(v, str):
                # Handle multiline string input
                if '\n' in v:
                    lines = []
                    for line in v.split('\n'):
                        cleaned_line = clean_log_line(line)
                        if cleaned_line:  # Only add non-empty lines
                            lines.append(cleaned_line)
                    return lines if lines else ["No valid logs found"]
                else:
                    # Single line input
                    cleaned = clean_log_line(v)
                    return [cleaned] if cleaned else ["Empty log"]
                    
            elif isinstance(v, list):
                cleaned_lines = []
                for line in v:
                    cleaned_line = clean_log_line(str(line))
                    if cleaned_line:  # Only add non-empty lines
                        cleaned_lines.append(cleaned_line)
                return cleaned_lines if cleaned_lines else ["No valid logs found"]
            else:
                # Try to convert to string
                cleaned = clean_log_line(str(v))
                return [cleaned] if cleaned else ["Invalid input"]
                
        except Exception as e:
            logger.warning(f"Log validation warning: {e}")
            # Be very permissive in error cases
            if isinstance(v, str):
                return [v] if v.strip() else ["Empty input"]
            elif isinstance(v, list):
                return [str(item) for item in v if str(item).strip()]
            else:
                return [str(v)]
    
    @validator('context', pre=True)
    def validate_context(cls, v):
        if v is None:
            return None
        # Clean context string as well
        if isinstance(v, str):
            # Remove control characters from context too
            cleaned = ''.join(char for char in v if ord(char) >= 32 or char in ['\t', '\n', '\r'])
            return cleaned.strip()
        return str(v)

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str = "1.0.0"

# Create FastAPI app
app = FastAPI(
    title="DevOps-GPT Simple",
    description="AI-Powered Log Analysis for DevOps",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_cleaning_middleware(request: Request, call_next):
    """Middleware to clean request bodies before processing - very permissive"""
    if request.method == "POST" and "/analyze-logs" in str(request.url):
        try:
            # Get the raw body
            body = await request.body()
            
            if body:
                # Decode with error handling
                try:
                    body_str = body.decode('utf-8')
                except UnicodeDecodeError:
                    body_str = body.decode('utf-8', errors='ignore')
                
                # Very minimal cleaning - only remove NULL bytes and extreme control chars
                cleaned_body = ''
                for char in body_str:
                    char_code = ord(char)
                    # Only remove NULL and a few extreme control chars
                    if char_code == 0 or (1 <= char_code <= 8):
                        cleaned_body += ' '
                    else:
                        cleaned_body += char
                
                # Replace the request body
                request._body = cleaned_body.encode('utf-8')
                
        except Exception as e:
            logger.debug(f"Middleware cleaning skipped: {e}")
            # Don't fail the request if middleware has issues
    
    response = await call_next(request)
    return response

# Custom exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors - be more permissive"""
    logger.warning(f"Validation warning: {exc}")
    
    # Try to extract the actual logs from the request and process them anyway
    try:
        body = await request.body()
        if body:
            body_str = body.decode('utf-8', errors='ignore')
            
            # Try to parse as JSON and extract logs
            import json
            try:
                data = json.loads(body_str)
                if 'logs' in data:
                    # Process the logs directly with minimal validation
                    logs = data['logs']
                    context = data.get('context', '')
                    
                    # Convert to list if string
                    if isinstance(logs, str):
                        log_list = [line.strip() for line in logs.split('\n') if line.strip()]
                    elif isinstance(logs, list):
                        log_list = [str(log).strip() for log in logs if str(log).strip()]
                    else:
                        log_list = [str(logs)]
                    
                    if log_list:
                        # Try to analyze with permissive approach
                        analysis = mistral_agent.analyze_logs(log_list, context)
                        return JSONResponse(
                            status_code=200,
                            content={
                                "success": True,
                                "analysis": analysis,
                                "processed_logs": len(log_list),
                                "message": "Analysis completed with permissive validation",
                                "warning": "Some input validation was bypassed"
                            }
                        )
            except:
                pass
    except:
        pass
    
    # Fall back to suggesting alternatives
    return JSONResponse(
        status_code=200,  # Return 200 instead of 400 to be more permissive
        content={
            "success": False,
            "error": "Input validation bypassed",
            "message": "Unable to process logs with current validation. Try the clean logs feature.",
            "suggestions": [
                "Click 'Clean Logs' button to automatically fix issues",
                "Try the sample logs to test the system",
                "Copy logs as plain text without formatting"
            ],
            "fallback_available": True
        }
    )

# Custom exception handler for JSON decode errors
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    if "JSON decode error" in str(exc) or "Invalid control character" in str(exc):
        return JSONResponse(
            status_code=400,
            content={
                "error": "Invalid input format",
                "message": "Please ensure your logs contain only valid text characters",
                "suggestion": "Remove any special control characters from your log input",
                "status_code": 400
            }
        )
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error", 
            "message": str(exc),
            "status_code": 500
        }
    )

# API Routes
@app.get("/")
async def root():
    """Root endpoint"""
    ai_status = "🤖 Mistral AI Active" if not mistral_agent.mock_mode else "⚙️ Pattern Matching Mode"
    
    return {
        "message": "DevOps-GPT - AI-Powered Log Analysis",
        "version": "1.0.0",
        "ai_status": ai_status,
        "description": "Intelligent log analysis with failure detection and recommendations",
        "capabilities": {
            "smart_log_analysis": True,
            "root_cause_detection": not mistral_agent.mock_mode,
            "actionable_recommendations": True,
            "failure_simulation": True,
            "technical_fixes": True
        },
        "endpoints": {
            "health": "/health - API health check",
            "analyze_logs": "/analyze-logs - AI-powered log analysis",
            "analyze_logs_raw": "/analyze-logs-raw - Raw log analysis (bypasses validation)",
            "clean_logs": "/clean-logs - Clean problematic logs",
            "simulate_failure": "/simulate-failure - Test with sample failure logs",
            "system_status": "/system/status - Detailed system information",
            "demo": "/demo.html - Interactive web interface"
        },
        "setup": {
            "api_key": "Set MISTRAL_API_KEY environment variable for AI features",
            "get_key": "https://console.mistral.ai/",
            "note": "App works without API key using intelligent pattern matching"
        }
    }

@app.get("/demo.html", response_class=HTMLResponse)
async def get_demo():
    """Serve the demo HTML page"""
    try:
        with open("demo.html", "r") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Demo page not found")

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now()
    )

@app.post("/clean-logs")
async def clean_logs(request: Request):
    """Clean logs by removing invalid characters before analysis"""
    try:
        # Get raw body
        body = await request.body()
        raw_text = body.decode('utf-8', errors='ignore')
        
        def clean_text(text):
            """Clean text by removing problematic characters"""
            cleaned = ''
            for char in text:
                char_code = ord(char)
                if char_code >= 32 or char in ['\t', '\n', '\r']:
                    cleaned += char
                else:
                    cleaned += ' '  # Replace control chars with space
            return cleaned
        
        cleaned_text = clean_text(raw_text)
        
        # Try to parse as JSON
        try:
            import json
            data = json.loads(cleaned_text)
            return {
                "success": True,
                "cleaned_data": data,
                "message": "Logs cleaned successfully"
            }
        except json.JSONDecodeError:
            # If not JSON, treat as plain text logs
            lines = [line.strip() for line in cleaned_text.split('\n') if line.strip()]
            return {
                "success": True,
                "cleaned_logs": lines,
                "total_lines": len(lines),
                "message": "Text logs cleaned successfully"
            }
        
    except Exception as e:
        logger.error(f"Error cleaning logs: {e}")
        return JSONResponse(
            status_code=400,
            content={
                "error": "Failed to clean logs",
                "message": str(e),
                "suggestion": "Try copying logs from a different source"
            }
        )

@app.post("/analyze-logs-raw")
async def analyze_logs_raw(request: Request):
    """Analyze logs without strict validation - for troublesome inputs"""
    try:
        # Get raw body and parse manually
        body = await request.body()
        body_str = body.decode('utf-8', errors='ignore')
        
        # Try to parse JSON
        try:
            import json
            data = json.loads(body_str)
            logs = data.get('logs', '')
            context = data.get('context', '')
        except:
            # If JSON parsing fails, treat entire body as logs
            logs = body_str
            context = 'Raw log input'
        
        # Convert logs to list with minimal processing
        if isinstance(logs, str):
            log_list = []
            for line in logs.split('\n'):
                line = line.strip()
                if line:  # Only add non-empty lines
                    log_list.append(line)
        elif isinstance(logs, list):
            log_list = [str(log).strip() for log in logs if str(log).strip()]
        else:
            log_list = [str(logs)]
        
        if not log_list:
            log_list = ["No valid logs found"]
        
        logger.info(f"Raw analysis of {len(log_list)} log lines")
        
        # Perform analysis - AWAIT the async function
        analysis = await mistral_agent.analyze_logs(log_list, context)
        
        return {
            "success": True,
            "analysis": analysis,
            "processed_logs": len(log_list),
            "message": "Raw analysis completed successfully",
            "method": "raw_processing"
        }
        
    except Exception as e:
        logger.error(f"Raw analysis error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e),
                "message": "Raw analysis failed",
                "suggestion": "Try the clean-logs endpoint first"
            }
        )

@app.post("/analyze-logs")
async def analyze_logs(request: LogAnalysisRequest):
    """Analyze logs using AI pattern matching with robust error handling"""
    try:
        logger.info(f"Received request to analyze {len(request.logs)} log lines")
        
        # Additional validation
        if not request.logs:
            raise HTTPException(status_code=400, detail="No logs provided for analysis")
        
        # Filter out any remaining invalid entries
        valid_logs = []
        for log in request.logs:
            if isinstance(log, str) and len(log.strip()) > 0:
                # Additional cleaning for safety
                cleaned_log = ''.join(char for char in log if ord(char) >= 32 or char in ['\n', '\t', '\r'])
                if cleaned_log.strip():
                    valid_logs.append(cleaned_log.strip())
        
        if not valid_logs:
            raise HTTPException(status_code=400, detail="No valid logs found after cleaning")
        
        # Limit processing for performance (increased limit for security logs)
        logs_to_analyze = valid_logs[-1000:] if len(valid_logs) > 1000 else valid_logs
        
        logger.info(f"Processing {len(logs_to_analyze)} cleaned log lines")
        
        # Perform analysis - AWAIT the async function
        analysis = await mistral_agent.analyze_logs(logs_to_analyze, request.context)
        
        return {
            "success": True,
            "analysis": analysis,
            "processed_logs": len(logs_to_analyze),
            "total_submitted": len(request.logs),
            "valid_logs": len(valid_logs),
            "truncated": len(valid_logs) > 1000,
            "message": "Analysis completed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing logs: {e}")
        # Return a fallback analysis instead of failing completely
        try:
            fallback_analysis = {
                "status": "ERROR",
                "severity": "MEDIUM",
                "confidence": 0.5,
                "summary": {
                    "total_logs": len(request.logs) if hasattr(request, 'logs') else 0,
                    "error_count": 1,
                    "warning_count": 0,
                    "critical_issues": 1
                },
                "issues": {
                    "critical": [f"Analysis failed: {str(e)[:100]}"],
                    "errors": ["Unable to process logs due to formatting issues"],
                    "warnings": []
                },
                "root_cause": "Log processing error - possible data format issues",
                "recommendations": [
                    "Try cleaning your logs using the 'Clean Logs' button",
                    "Check for special characters in your log input",
                    "Use the sample logs to test the system"
                ],
                "fixes": [
                    "Remove special characters from logs",
                    "Ensure logs are in plain text format"
                ],
                "analysis_method": "error_fallback",
                "timestamp": datetime.now().isoformat(),
                "context": "Error recovery mode"
            }
            
            return {
                "success": False,
                "analysis": fallback_analysis,
                "error": str(e),
                "message": "Analysis failed but provided fallback results"
            }
        except:
            raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/simulate-failure")
async def simulate_failure():
    """Simulate different types of failures for testing"""
    try:
        # Sample failure logs for different types
        deployment_logs = [
            "2024-01-15 10:30:15 [INFO] Starting deployment process...",
            "2024-01-15 10:30:16 [INFO] Pulling image: myapp:latest",
            "2024-01-15 10:30:45 [INFO] Image pulled successfully",
            "2024-01-15 10:30:46 [INFO] Starting container...",
            "2024-01-15 10:30:47 [ERROR] Container failed to start",
            "2024-01-15 10:30:47 [CRITICAL] Port 8080 already in use by process 1234",
            "2024-01-15 10:30:47 [ERROR] bind: address already in use",
            "2024-01-15 10:30:48 [ERROR] Failed to bind to 0.0.0.0:8080",
            "2024-01-15 10:30:49 [WARNING] Force killing container after timeout",
            "2024-01-15 10:30:50 [INFO] Rolling back deployment...",
            "2024-01-15 10:30:51 [INFO] Rollback completed successfully"
        ]
        
        web_logs = [
            '127.0.0.1 - - [15/Jan/2024:10:30:01 +0000] "GET /api/users HTTP/1.1" 200 1234',
            '192.168.1.100 - - [15/Jan/2024:10:30:15 +0000] "POST /api/login HTTP/1.1" 500 0',
            '192.168.1.100 - - [15/Jan/2024:10:30:16 +0000] "GET /api/data HTTP/1.1" 404 0',
            '10.0.0.50 - - [15/Jan/2024:10:30:30 +0000] "GET /health HTTP/1.1" 503 0',
            '[ERROR] Database connection timeout after 30 seconds',
            '[ERROR] Failed to process request: Internal server error',
            '[WARNING] High response time detected: 5.2 seconds',
            '[CRITICAL] Service unavailable - database down'
        ]
        
        security_logs = [
            "Jan 15 10:30:01 server sshd[1234]: authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost=192.168.1.100 user=root",
            "Jan 15 10:30:05 server sshd[1235]: Failed password for root from 192.168.1.100 port 22 ssh2",
            "Jan 15 10:30:10 server sshd[1236]: authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost=192.168.1.100 user=admin",
            "Jan 15 10:30:15 server sshd[1237]: Failed password for admin from 192.168.1.100 port 22 ssh2",
            "Jan 15 10:30:20 server sshd[1238]: check pass; user unknown",
            "Jan 15 10:30:25 server sshd[1239]: authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost=10.0.0.50 user=root"
        ]
        
        system_logs = [
            "Jan 15 10:30:01 server systemd[1]: mysql.service: Main process exited, code=exited, status=1/FAILURE",
            "Jan 15 10:30:02 server systemd[1]: mysql.service: Failed with result 'exit-code'.",
            "Jan 15 10:30:05 server kernel: [12345.678] Out of memory: Kill process 1234 (java) score 900",
            "Jan 15 10:30:10 server systemd[1]: Failed to start Apache HTTP Server",
            "Jan 15 10:30:15 server kernel: [12350.123] disk full",
            "Jan 15 10:30:20 server systemd[1]: nginx.service: Service hold-off time over, scheduling restart"
        ]
        
        # Combine different log types for a comprehensive test
        all_logs = deployment_logs + web_logs[:4] + security_logs[:3] + system_logs[:3]
        
        # AWAIT the async function
        analysis = await mistral_agent.analyze_logs(all_logs, "Multi-type failure simulation")
        
        return {
            "simulation": "multi_type_failure",
            "logs": all_logs,
            "analysis": analysis,
            "log_types_included": ["application", "web", "security", "system"],
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in simulation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/system/status")
async def get_system_status():
    """Get system configuration status"""
    return {
        "api_status": "running",
        "mistral_package_installed": MISTRAL_AVAILABLE,
        "mistral_api_key_configured": bool(MISTRAL_API_KEY and MISTRAL_API_KEY != "your_actual_mistral_api_key_here"),
        "analysis_mode": "AI-powered" if (MISTRAL_AVAILABLE and MISTRAL_API_KEY and MISTRAL_API_KEY != "your_actual_mistral_api_key_here") else "Pattern-based",
        "version": "1.0.0",
        "endpoints": {
            "analyze_logs": "/analyze-logs",
            "clean_logs": "/clean-logs", 
            "system_status": "/system/status"
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
