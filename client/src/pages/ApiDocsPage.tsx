import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Icon } from '../components/ui/Icon';
import { Notification, SystemStatusData, User } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ApiDocsPageProps {
  onNavigate: (page: string) => void;
  onLogout: () => Promise<void>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  notifications: Notification[];
  openSettings: () => void;
  systemStatus: SystemStatusData;
  user: User | null;
}

// ─── Helper Components ──────────────────────────────────────────────────────

const CodeBlock: React.FC<{ code: string, lang?: string, showCopy?: boolean }> = ({ code, lang = 'json', showCopy = true }) => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group bg-slate-800/70 border border-slate-700/50 rounded-lg">
            <pre className="p-4 text-sm text-left overflow-x-auto text-slate-300 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                <code className={`language-${lang}`}>{code}</code>
            </pre>
            {showCopy && (
                <button 
                    onClick={copyToClipboard} 
                    className="absolute top-2 right-2 p-2 rounded-md bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                >
                    <Icon name={copied ? 'check' : 'copy'} className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

const DocCard: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-slate-900/70 backdrop-blur border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <Icon name={icon} className="w-5 h-5 text-blue-400"/>
            {title}
        </h2>
        <div className="space-y-4 text-slate-400">
            {children}
        </div>
    </div>
);

const EndpointDisplay: React.FC<{ method: 'POST' | 'GET'; path: string; }> = ({ method, path }) => (
    <div className="bg-slate-800/70 border border-slate-700/50 rounded-lg px-4 py-3">
        <code className="text-sm">
            <span className={`font-bold mr-3 ${method === 'POST' ? 'text-green-400' : 'text-blue-400'}`}>{method}</span>
            <span className="text-slate-300">{path}</span>
        </code>
    </div>
);

const Tag: React.FC<{ label: string, color: string }> = ({ label, color }) => (
    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${color}`}>
        {label}
    </span>
);

// ─── Main Page Component ────────────────────────────────────────────────────

export const ApiDocsPage: React.FC<ApiDocsPageProps> = (props) => {
  const { onNavigate, user } = props;
  const endpointUrl = import.meta.env.VITE_API_URL || 'https://<YOUR_API_ID>.execute-api.<REGION>.amazonaws.com/prod';

  const curlExample = `curl -X POST ${endpointUrl}/notifications \\
     -H "Content-Type: application/json" \\
     -d '{ 
        "topic_name": "Deploys", 
        "title": "New Feature Launch", 
        "message": "Our new analytics dashboard is now live.", 
        "severity": "low" 
     }'`;

  const curlTestExample = `curl -X POST ${endpointUrl}/notifications/test`;

  return (
    <div className="flex flex-col h-screen bg-slate-950 md:ml-72">
        <Header {...props} profile={user} title="API Documentation" />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center mb-6">
                    <button onClick={() => onNavigate('dashboard')} className="p-2 rounded-full hover:bg-slate-800 mr-3">
                        <Icon name="arrow-left" className="h-5 w-5 text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">API Documentation</h1>
                        <p className="text-slate-400 mt-1">Guide to programmatically interacting with the notification system.</p>
                    </div>
                </div>
               
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-8">
                        <DocCard title="Overview" icon="book-marked">
                            <p>The API allows you to programmatically send notifications to topics, which are then broadcast to subscribed users. The primary endpoint for creating notifications is public and does not require authentication for ease of integration.</p>
                            <div className="flex gap-2 flex-wrap pt-2">
                                <Tag label="REST API" color="bg-blue-500/20 text-blue-300" />
                                <Tag label="JSON Payloads" color="bg-green-500/20 text-green-300" />
                                <Tag label="Public & Private Endpoints" color="bg-purple-500/20 text-purple-300" />
                            </div>
                        </DocCard>

                        <DocCard title="Authentication" icon="key">
                             <p>Most API endpoints require a JWT from AWS Cognito for authentication. Include this token in the <code className='bg-slate-700/50 px-1.5 py-0.5 rounded-md text-xs font-mono'>Authorization</code> header as a Bearer token. The notification creation endpoints are public and do not require this header.</p>
                            <CodeBlock code={'Authorization: Bearer <YOUR_JWT_TOKEN>'} lang="text" showCopy={false}/>
                        </DocCard>

                        <DocCard title="Public Endpoints" icon="globe">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold text-white mb-2">Create Notification</h3>
                                    <EndpointDisplay method="POST" path={'/notifications'} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white mb-2">Send Test Notification</h3>
                                    <EndpointDisplay method="POST" path={'/notifications/test'} />
                                </div>
                            </div>
                        </DocCard>
                        
                        <DocCard title="Example Requests" icon="code">
                            <p>Here is an example of creating a notification for a specific topic using cURL. No authorization is needed for this endpoint.</p>
                            <CodeBlock code={curlExample} lang="bash" />
                            
                            <p className="pt-4">To send a pre-configured test notification for verification, use the following cURL command:</p>
                            <CodeBlock code={curlTestExample} lang="bash" />
                        </DocCard>

                    </div>

                    <aside className="space-y-8 lg:sticky lg:top-8">
                         <DocCard title="Field Reference" icon="list">
                            <div className="space-y-6 text-sm">
                                <div>
                                    <h4 className="font-semibold text-white mb-3">Required Fields</h4>
                                    <ul className="space-y-3 text-slate-400">
                                        <li><code className="bg-slate-700/50 px-1.5 py-0.5 rounded-md text-xs font-mono">title</code>: The main title of the alert.</li>
                                        <li><code className="bg-slate-700/50 px-1.5 py-0.5 rounded-md text-xs font-mono">message</code>: The detailed body of the alert.</li>
                                        <li><code className="bg-slate-700/50 px-1.5 py-0.5 rounded-md text-xs font-mono">severity</code>: Set to <code className='text-xs'>low</code>, <code className='text-xs'>medium</code>, or <code className='text-xs'>high</code>.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white mb-3">Optional Fields</h4>
                                    <ul className="space-y-3 text-slate-400">
                                        <li><code className="bg-slate-700/50 px-1.5 py-0.5 rounded-md text-xs font-mono">topic_name</code>: The name of the topic to associate with the notification.</li>
                                        <li><code className="bg-slate-700/50 px-1.5 py-0.5 rounded-md text-xs font-mono">type</code>: A string to categorize the notification (e.g., 'webhook').</li>
                                        <li><code className="bg-slate-700/50 px-1.5 py-0.5 rounded-md text-xs font-mono">metadata</code>: A JSON object for any extra data.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white mb-3">Response Codes</h4>
                                     <ul className="space-y-2 text-slate-400">
                                        <li><span className="font-mono text-green-400">201 Created</span>: Success</li>
                                        <li><span className="font-mono text-amber-400">400 Bad Request</span>: Missing fields or invalid data.</li>
                                        <li><span className="font-mono text-red-400">500 Server Error</span>: Internal server error.</li>
                                    </ul>
                                </div>
                            </div>
                         </DocCard>
                          <DocCard title="Authenticated Endpoints" icon="lock">
                             <p className="text-sm">Other endpoints, such as listing users, teams, or topics, require authentication. Please refer to the backend source code for the full API specification.</p>
                          </DocCard>
                    </aside>
               </div>
            </div>
        </main>
    </div>
  );
};