import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '../components/layout/Header';
import { Icon } from '../components/ui/Icon';
import { getTopics, getWebhookSources, addWebhookSource, deleteWebhookSource } from '../lib/api';
import { type User, type Topic, type WebhookSource, type Notification } from '../types';

interface IntegrationPageProps {
    user: User | null;
    onLogout: () => Promise<void>;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
    notifications: Notification[];
    openSettings: () => void;
    systemStatus: any;
    onNavigate: (path: string) => void;
}

const webhookBaseUrl = `https://${import.meta.env.VITE_API_URL}/webhook`;

const sourceTypes = [
    { key: 'generic', name: 'Generic Webhook', icon: 'webhook', color: 'text-slate-400' },
    { key: 'adyen', name: 'Adyen Payments', icon: 'credit-card', color: 'text-green-500' },
    { key: 'github', name: 'GitHub Actions', icon: 'github', color: 'text-purple-500' },
    { key: 'pagerduty', name: 'PagerDuty', icon: 'siren', color: 'text-blue-500' },
];

const IntegrationPage: React.FC<IntegrationPageProps> = (props) => {
    const [sources, setSources] = useState<WebhookSource[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formType, setFormType] = useState<string>('generic');
    const [formTopicId, setFormTopicId] = useState<string>('');

    const [copiedId, setCopiedId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [sourcesData, topicsData] = await Promise.all([getWebhookSources(), getTopics()]);
            setSources(sourcesData || []);
            setTopics(topicsData || []);
        } catch (error) {
            console.error("Failed to load integration data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName || isSubmitting || !props.user) return;
        setIsSubmitting(true);
        try {
            const newSource = await addWebhookSource({
                name: formName,
                description: formDescription,
                source_type: formType,
                topic_id: formTopicId || null,
                user_id: props.user.id,
            });
            setSources(prev => [newSource, ...prev]);
            setIsCreating(false);
            setFormName('');
            setFormDescription('');
            setFormType('generic');
            setFormTopicId('');
        } catch (error) {
            console.error("Failed to create webhook source:", error);
            alert("Failed to create integration. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this webhook source? This cannot be undone.')) {
            try {
                await deleteWebhookSource(id);
                setSources(prev => prev.filter(s => s.id !== id));
            } catch (error) {
                console.error("Failed to delete webhook source:", error);
                alert("Failed to delete integration. Please try again.");
            }
        }
    };

    const getWebhookUrl = (sourceId: string) => `${webhookBaseUrl}?source_id=${sourceId}`;

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    const topicMap = useMemo(() => new Map(topics.map(t => [t.id, t.name])), [topics]);

    const sourceTypeMap = useMemo(() => new Map(sourceTypes.map(st => [st.key, st])), []);

    return (
        <div className="flex-1 flex flex-col h-screen bg-background text-foreground">
             <Header {...props} profile={props.user} title="Integrations" />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                <div className="max-w-6xl mx-auto"> 
                    <h1 className="text-3xl font-bold mb-2">Integration Hub</h1>
                    <p className="text-muted-foreground mb-8">Connect your tools, amplify your signals. The MCM Integration Hub provides a central place to manage incoming webhooks.</p>

                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           {[...Array(3)].map((_, i) => (
                               <div key={i} className="h-48 bg-card border border-border rounded-[2rem] p-8 animate-pulse"></div>
                           ))}
                        </div>
                    ) : (
                       <> 
                        {!isCreating && (
                             <button onClick={() => setIsCreating(true)} className="btn btn-primary mb-8">
                                <Icon name="plus" className="w-4 h-4 mr-2"/> Add New Integration
                            </button>
                        )}

                        {isCreating && (
                             <div className="bg-card border border-border rounded-[2rem] mb-8">
                                <form onSubmit={handleCreate} className="p-6 md:p-8">
                                    <h3 className="font-semibold text-xl mb-6">New Webhook Integration</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label htmlFor="name" className="label">Integration Name</label>
                                            <input id="name" type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g., Production API Alerts" className="input" required/>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label htmlFor="description" className="label">Description (Optional)</label>
                                            <textarea id="description" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="A brief summary of what this integration is for." className="input h-24"></textarea>
                                        </div>
                                        <div>
                                            <label htmlFor="source_type" className="label">Source Type</label>
                                            <select id="source_type" value={formType} onChange={e => setFormType(e.target.value)} className="input">
                                                {sourceTypes.map(st => <option key={st.key} value={st.key}>{st.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="topic_id" className="label">Post to Topic</label>
                                            <select id="topic_id" value={formTopicId} onChange={e => setFormTopicId(e.target.value)} className="input">
                                                <option value="">Default (Uncategorized)</option>
                                                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 mt-8">
                                        <button type="button" onClick={() => setIsCreating(false)} className="btn btn-secondary">Cancel</button>
                                        <button type="submit" className="btn btn-primary" disabled={isSubmitting || !formName}>
                                            {isSubmitting ? <div className="spinner-xs"/> : 'Create Integration'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {sources.length === 0 && !isCreating ? (
                               <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
                                   <Icon name="webhook" className="mx-auto h-12 w-12 text-muted-foreground" />
                                   <h3 className="mt-4 text-lg font-semibold text-foreground">Your Integration Hub is Empty</h3>
                                   <p className="mt-2 text-sm text-muted-foreground">Get started by creating your first webhook integration.</p>
                                    <button onClick={() => setIsCreating(true)} className="btn btn-primary mt-6">
                                        <Icon name="plus" className="w-4 h-4 mr-2"/> Add Integration
                                    </button>
                               </div>
                        ) : (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {sources.map(source => {
                                    const typeInfo = sourceTypeMap.get(source.source_type) || sourceTypeMap.get('generic')!;
                                    const webhookUrl = getWebhookUrl(source.id);
                                    return (
                                        <div key={source.id} className="group bg-card border border-border rounded-[2rem] p-6 hover:shadow-xl transition-all relative flex flex-col">
                                            <div className="flex-grow">
                                                <div className="flex items-start justify-between">
                                                    <div className={`w-14 h-14 rounded-2xl ${typeInfo.color} bg-opacity-10 flex items-center justify-center`}>
                                                        <Icon name={typeInfo.icon} className={`w-7 h-7 ${typeInfo.color}`} />
                                                    </div>
                                                    <button onClick={() => handleDelete(source.id)} className="btn btn-xs btn-ghost text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Icon name="trash-2" className="w-4 h-4"/>
                                                    </button>
                                                </div>
                                                <h3 className="text-xl font-bold mt-4 mb-2">{source.name}</h3>
                                                <p className="text-sm text-muted-foreground mb-4 h-10">{source.description || `Accepts ${typeInfo.name} payloads.`}</p>
                                            </div>
                                            
                                            <div className="mt-auto">
                                                {source.topic_id && topicMap.has(source.topic_id) && (
                                                    <div className="mb-3 text-xs text-muted-foreground flex items-center gap-2">
                                                        <Icon name="tag" className="w-3 h-3"/>
                                                        Posts to: <span className="font-semibold text-foreground">{topicMap.get(source.topic_id)}</span>
                                                    </div>
                                                )}

                                                <label className="text-xs font-semibold text-muted-foreground">Webhook URL</label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <code className="text-[11px] font-mono whitespace-nowrap overflow-x-auto text-primary/80 bg-muted p-2 rounded-md w-full">
                                                        {webhookUrl}
                                                    </code>
                                                    <button onClick={() => copyToClipboard(webhookUrl, source.id)} className="btn btn-sm btn-ghost flex-shrink-0">
                                                        {copiedId === source.id ? <Icon name="check" className="w-4 h-4 text-green-500"/> : <Icon name="copy" className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                       </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default IntegrationPage;
