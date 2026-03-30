import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Icon } from '../components/ui/Icon';
import { Notification, SystemStatusData, User } from '../types';

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

const CodeBlock: React.FC<{ code: string, lang?: string }> = ({ code, lang = 'json' }) => {
    const [copied, setCopied] = useState(false);
    const copyToClipboard = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group">
            <pre className={`bg-muted p-4 rounded-md text-sm text-left overflow-x-auto`}>
                <code className={`language-${lang} text-foreground`}>{code}</code>
            </pre>
            <button onClick={copyToClipboard} className="absolute top-2 right-2 p-1.5 rounded-md bg-background/50 hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity">
                <Icon name={copied ? 'check' : 'copy'} className="w-4 h-4 text-muted-foreground"/>
            </button>
        </div>
    );
};

export const ApiDocsPage: React.FC<ApiDocsPageProps> = ({ onNavigate, onLogout, isSidebarOpen, setIsSidebarOpen, notifications, openSettings, systemStatus, user }) => {
  const endpointUrl = import.meta.env.VITE_API_URL || 'https://<YOUR_API_ID>.execute-api.<REGION>.amazonaws.com/prod';

  const curlExample = `curl -X POST ${endpointUrl}/notifications \
     -H "Content-Type: application/json" \
     -d '{
        "topic_name": "Deploys",
        "title": "New Feature Launch",
        "message": "Our new analytics dashboard is now live.",
        "severity": "low"
     }'`;

  const curlTestExample = `curl -X POST ${endpointUrl}/notifications/test`;

  return (
    <>
        <Header onLogout={onLogout} notifications={notifications} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} openSettings={openSettings} systemStatus={systemStatus} profile={user} onNavigate={onNavigate} />
        <main className="flex-1 overflow-y-auto bg-background md:ml-72">
           <div className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex items-center mb-8">
                    <button onClick={() => onNavigate('dashboard')} className="p-2 rounded-full hover:bg-muted mr-4">
                        <Icon name="arrow-left" className="h-5 w-5 text-foreground" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">API Documentation</h1>
                        <p className="text-muted-foreground mt-1">Guide to integrating with the notification API.</p>
                    </div>
                </div>
               
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="p-6 bg-card rounded-xl border">
                            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2"><Icon name="book-marked" className="w-5 h-5"/> Overview</h2>
                            <p className="text-muted-foreground mb-4">The API allows you to programmatically send notifications. The endpoints for creating notifications are public, while other endpoints require authentication.</p>
                            <div className="flex gap-2 flex-wrap">
                                 <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">REST API</span>
                                 <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-600">JSON</span>
                                 <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-600">Public Endpoints</span>
                                 <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-500/10 text-purple-600">JWT Auth</span>
                            </div>
                        </div>

                        <div className="p-6 bg-card rounded-xl border">
                             <h2 className="text-xl font-semibold mb-3">Authentication</h2>
                             <p className="text-muted-foreground mb-4">
                                 Most API requests are authenticated using a JSON Web Token (JWT) from AWS Cognito. For those endpoints, you must include the token in the `Authorization` header. However, the `POST /notifications` and `POST /notifications/test` endpoints are public and do not require authentication.
                             </p>
                            <CodeBlock code={'Authorization: Bearer <YOUR_JWT_TOKEN>'} lang="text" />
                        </div>

                        <div className="p-6 bg-card rounded-xl border">
                            <h2 className="text-xl font-semibold mb-3">Public Endpoints</h2>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold">Create Notification</h3>
                                    <div className="relative bg-muted p-4 rounded-md mt-2">
                                        <code className="text-sm"><span className="font-bold text-green-500">POST</span> {endpointUrl}/notifications</code>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Send Test Notification</h3>
                                    <div className="relative bg-muted p-4 rounded-md mt-2">
                                        <code className="text-sm"><span className="font-bold text-green-500">POST</span> {endpointUrl}/notifications/test</code>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 bg-card rounded-xl border">
                            <h2 className="text-xl font-semibold mb-3">Example Requests</h2>
                            <p className="text-muted-foreground mb-4">Here is an example of how to create a notification for a specific topic using cURL. No authorization is needed.</p>
                            <CodeBlock code={curlExample} lang="bash" />
                            <p className="text-muted-foreground my-4">To send a pre-configured test notification, use the following cURL command:</p>
                            <CodeBlock code={curlTestExample} lang="bash" />
                        </div>

                    </div>

                    <div className="space-y-6">
                         <div className="p-6 bg-card rounded-xl border">
                            <h3 className="text-lg font-semibold mb-4">Field Reference for POST /notifications</h3>
                            <div className="space-y-4 text-sm">
                                <div>
                                    <h4 className="font-semibold mb-2">Required Fields</h4>
                                    <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-2">
                                        <li><code className="text-xs bg-muted rounded px-1.5 py-1 font-mono">title</code>: The main title of the alert.</li>
                                        <li><code className="text-xs bg-muted rounded px-1.5 py-1 font-mono">message</code>: The detailed body of the alert.</li>
                                        <li><code className="text-xs bg-muted rounded px-1.5 py-1 font-mono">severity</code>: <code className="text-xs">low</code>, <code className="text-xs">medium</code>, or <code className="text-xs">high</code>.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Optional Fields</h4>
                                    <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-2">
                                        <li><code className="text-xs bg-muted rounded px-1.5 py-1 font-mono">topic_name</code>: The name of the topic to associate with the notification.</li>
                                        <li><code className="text-xs bg-muted rounded px-1.5 py-1 font-mono">type</code>: A string to categorize the notification (e.g., 'webhook', 'system'). Defaults to 'webhook'.</li>
                                        <li><code className="text-xs bg-muted rounded px-1.5 py-1 font-mono">metadata</code>: A JSON object for any extra data.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Response Codes</h4>
                                     <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-2">
                                        <li><span className="font-mono text-green-500">201 Created</span>: Success</li>
                                        <li><span className="font-mono text-yellow-500">400 Bad Request</span>: Missing fields or invalid data.</li>
                                        <li><span className="font-mono text-red-500">500 Server Error</span>: Internal server error.</li>
                                    </ul>
                                </div>
                            </div>
                         </div>
                          <div className="p-6 bg-card rounded-xl border">
                             <h3 className="text-lg font-semibold mb-2">Authenticated Endpoints</h3>
                             <p className="text-sm text-muted-foreground mb-4">Other endpoints, such as listing notifications, getting details, or adding comments, require authentication. Please refer to the source code for more details on these endpoints.</p>
                          </div>
                    </div>
               </div>
           </div>
        </main>
    </>
  );
};