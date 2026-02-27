import React, { useState, useCallback, useMemo } from 'react';

// ==================================================================
// Type Definitions
// ==================================================================

interface Log {
    type: 'INFO' | 'ACTION' | 'SUCCESS' | 'FAIL';
    message: string;
    index?: number; // Optional index for correlating with screenshots
}

interface ExecutionStep {
    action: 'navigate' | 'click' | 'type' | 'assert_visible';
    target: string;
    value?: string;
}

interface AgentResponse {
    status: 'SUCCESS' | 'FAILURE';
    logs: Log[];
    screenshotTimeline?: string[]; // Array of base64 encoded image strings
}

// ==================================================================
// Local Playwright Agent Endpoint
const AGENT_URL = 'http://localhost:3001/run-test';
// ==================================================================


// ==================================================================
// API Functions
// ==================================================================

const callRemoteAgent = async (url: string, plan: ExecutionStep[]): Promise<AgentResponse> => {
    try {
        const response = await fetch(AGENT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUrl: url, executionPlan: plan }),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ error: 'Agent returned a non-JSON error.' }));
            throw new Error(`Request failed (Status: ${response.status}). Details: ${errorBody.error || 'Check agent logs.'}`);
        }

        return response.json();

    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to execute flow. Is the agent running? Details: ${message}`);
    }
};

// ==================================================================
// Components (Light Theme Applied)
// ==================================================================

interface LogDisplayProps {
    logs: Log[];
    loading: boolean;
}

const LogDisplay: React.FC<LogDisplayProps> = ({ logs, loading }) => {
    const getLogColor = (type: Log['type']) => {
        switch (type) {
            case 'INFO': return 'text-sky-600';
            case 'ACTION': return 'text-amber-600';
            case 'SUCCESS': return 'text-green-600';
            case 'FAIL': return 'text-red-700 font-semibold';
            default: return 'text-gray-500';
        }
    };

    return (
        <div className="h-full bg-gray-100 p-4 rounded-b-xl overflow-y-auto font-mono text-sm border border-t-0 border-gray-300">
            {logs.length === 0 && !loading ? (
                <p className="text-gray-500">No logs yet. Enter a URL and a flow to start monitoring.</p>
            ) : (
                logs.map((log, index) => (
                    <div key={index} className="flex space-x-2">
                        <span className="text-gray-500">[{index + 1}]</span>
                        <span className={getLogColor(log.type)}>[{log.type}]</span>
                        <span className="text-gray-800 break-words">{log.message}</span>
                    </div>
                ))
            )}
            {loading && (
                <div className="flex items-center text-sky-600 mt-2">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-sky-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Executing flow...
                </div>
            )}
        </div>
    );
};

interface TimelineDisplayProps {
    timeline: string[];
    logs: Log[];
}

const TimelineDisplay: React.FC<TimelineDisplayProps> = ({ timeline, logs }) => {
    const [currentStep, setCurrentStep] = useState(0);

    React.useEffect(() => {
        setCurrentStep(0);
    }, [timeline]);

    if (!timeline || timeline.length === 0) {
        return <div className="text-center p-8 text-gray-500 bg-white rounded-b-xl h-full">No screenshots captured yet.</div>;
    }

    const currentLog = logs.find(log => log.index === currentStep + 1);
    const screenshotSrc = `data:image/png;base64,${timeline[currentStep]}`;
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        e.currentTarget.onerror = null; 
        e.currentTarget.src = "https://placehold.co/1280x720/f3f4f6/6b7280?text=Screenshot+Missing"; 
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-white rounded-b-xl overflow-hidden">
            <div className="flex-1 p-4 flex flex-col justify-between items-center bg-gray-50 border-r border-gray-200 md:h-full">
                <div className="w-full h-full flex items-center justify-center overflow-hidden">
                    <img 
                        src={screenshotSrc} 
                        alt={`Step ${currentStep + 1} screenshot`} 
                        className="max-w-full max-h-full object-contain rounded-lg shadow-xl border border-gray-300"
                        onError={handleImageError}
                    />
                </div>
                <div className="flex items-center justify-center space-x-4 mt-4 text-gray-700 w-full">
                    <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0} className="p-2 rounded-full bg-gray-300 hover:bg-gray-400 disabled:opacity-30 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <span className="font-semibold text-sky-600">Step {currentStep + 1} of {timeline.length}</span>
                    <button onClick={() => setCurrentStep(s => Math.min(timeline.length - 1, s + 1))} disabled={currentStep === timeline.length - 1} className="p-2 rounded-full bg-gray-300 hover:bg-gray-400 disabled:opacity-30 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>
            <div className="md:w-1/3 p-4 overflow-y-auto border-t md:border-t-0 border-gray-200">
                <h4 className="text-md font-bold mb-3 text-sky-600">Current Step Details</h4>
                <div className="bg-gray-100 p-3 rounded-lg text-sm h-full text-gray-800 border border-gray-300">
                    {currentLog ? (
                        <>
                            <p className="font-mono break-words text-gray-700">{currentLog.message}</p>
                            <p className="mt-2 text-xs text-gray-500">Action Type: <span className="text-amber-600 font-medium">{currentLog.type}</span></p>
                        </>
                    ) : (
                        <p className="text-gray-500">Log detail not available for this specific screenshot.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

interface MetricCardProps {
    title: string;
    value: string | number;
    unit?: string;
    color?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit, color }) => (
    <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200 h-full">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className={`text-2xl font-bold mt-1 ${color || 'text-gray-900'}`}>
            {value}
            {unit && <span className="text-base font-normal ml-1 text-gray-500">{unit}</span>}
        </p>
    </div>
);

// ==================================================================
// Main App Component
// ==================================================================

type RunStatus = 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILURE';
type ActiveTab = 'timeline' | 'logs';

const defaultFlow = JSON.stringify([
    { action: 'navigate', target: '/' },
    { action: 'assert_visible', target: 'input[name="q"]' },
    { action: 'type', target: 'input[name="q"]', value: 'Playwright testing' },
    { action: 'click', target: 'button[type="submit"]' }
], null, 2);

export default function SyntheticMonitoringPage() {
    const [targetUrl, setTargetUrl] = useState('https://www.google.com');
    const [flowJson, setFlowJson] = useState(defaultFlow);
    const [runStatus, setRunStatus] = useState<RunStatus>('IDLE');
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<Log[]>([]);
    const [screenshotTimeline, setScreenshotTimeline] = useState<string[]>([]);
    const [runTimeMs, setRunTimeMs] = useState(0);
    const [activeTab, setActiveTab] = useState<ActiveTab>('timeline');

    const totalSteps = useMemo(() => logs.filter(l => l.type !== 'INFO').length, [logs]);
    
    const startMonitoring = useCallback(async () => {
        const startTime = Date.now();
        setLoading(true);
        setRunStatus('RUNNING');
        setLogs([]);
        setScreenshotTimeline([]);
        setRunTimeMs(0);
        setActiveTab('logs');
        let executionPlan: ExecutionStep[];

        try {
            try {
                executionPlan = JSON.parse(flowJson);
            } catch (e) {
                throw new Error('Invalid JSON in the execution plan.');
            }
            
            setLogs(prev => [...prev, { type: 'INFO', message: `Execution plan parsed. Executing via local agent...` }]);
            const result = await callRemoteAgent(targetUrl, executionPlan);
            const endTime = Date.now();
            
            setLogs(result.logs);
            setRunStatus(result.status);
            setScreenshotTimeline(result.screenshotTimeline || []);
            setRunTimeMs(endTime - startTime);
            
            if (result.screenshotTimeline && result.screenshotTimeline.length > 0) {
                setActiveTab('timeline');
            } else {
                setActiveTab('logs');
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setRunStatus('FAILURE');
            setLogs(prev => [...prev, { type: 'FAIL', message: `Critical flow error: ${errorMessage}` }]);
            console.error("Monitoring flow failed:", error);
        } finally {
            setLoading(false);
        }
    }, [targetUrl, flowJson]);

    const statusClasses: Record<RunStatus, string> = {
        IDLE: 'bg-gray-300 text-gray-700',
        RUNNING: 'bg-sky-500 text-white animate-pulse',
        SUCCESS: 'bg-green-500 text-white',
        FAILURE: 'bg-red-500 text-white',
    };

    const getTabClass = (tab: ActiveTab) => 
        `px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === tab 
                ? 'border-sky-600 text-sky-700 bg-white' 
                : 'border-transparent text-gray-600 hover:text-sky-700 hover:border-gray-300'
        }`;

    return (
        <main className="flex-grow md:ml-72 p-4 sm:p-8 bg-gray-50 text-gray-900 font-['Inter']">
            <header className="mb-8 flex justify-between items-end border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-cyan-700">
                        Playwright-Based Synthetic Monitoring
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Flow execution via Local Playwright Agent
                    </p>
                </div>
            </header>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-1/3 flex flex-col space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-200">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b border-gray-200 pb-2">Execution Inputs</h2>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target URL</label>
                        <input
                            type="url"
                            value={targetUrl}
                            onChange={(e) => setTargetUrl(e.target.value)}
                            placeholder="e.g., https://example.com"
                            className="w-full p-3 rounded-lg bg-gray-100 border border-gray-300 focus:ring-sky-500 focus:border-sky-500 mb-4 text-gray-900"
                            disabled={loading}
                        />
                        <label className="block text-sm font-medium text-gray-700 mb-1">Execution Plan (JSON)</label>
                        <textarea
                            value={flowJson}
                            onChange={(e) => setFlowJson(e.target.value)}
                            placeholder='Enter the execution plan in JSON format.'
                            rows={12}
                            className="w-full p-3 rounded-lg bg-gray-100 border border-gray-300 focus:ring-sky-500 focus:border-sky-500 resize-none text-gray-900 font-mono text-sm"
                            disabled={loading}
                        />
                        <div className="flex flex-col gap-3 mt-4">
                            <button onClick={startMonitoring} disabled={loading || !targetUrl || !flowJson} className={`py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 focus:ring-4 focus:ring-sky-500 focus:ring-opacity-50'}`}>
                                {loading ? 'Running Test...' : 'Run Synthetic Test'}
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <MetricCard title="Status" value={runStatus} color={statusClasses[runStatus].replace('bg-', 'text-').split(' ')[0]} />
                        <MetricCard title="Execution Time" value={(runTimeMs / 1000).toFixed(2)} unit="s" color={runStatus === 'SUCCESS' ? 'text-green-600' : 'text-gray-500'} />
                        <MetricCard title="Steps Executed" value={totalSteps} unit="steps" color={'text-cyan-600'} />
                        <MetricCard title="Timeline Frames" value={screenshotTimeline.length} unit="frames" color={'text-purple-600'} />
                    </div>
                </div>
                
                <div className="lg:w-2/3 bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col">
                    <div className="flex border-b border-gray-200 px-4 pt-2 shrink-0">
                        <button className={getTabClass('timeline')} onClick={() => setActiveTab('timeline')} disabled={!screenshotTimeline || screenshotTimeline.length === 0}>Visual Timeline</button>
                        <button className={getTabClass('logs')} onClick={() => setActiveTab('logs')}>Raw Agent Logs</button>
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        {activeTab === 'timeline' && <TimelineDisplay timeline={screenshotTimeline} logs={logs} />}
                        {activeTab === 'logs' && <LogDisplay logs={logs} loading={loading} />}
                    </div>
                </div>
            </div>
        </main>
    );
}
