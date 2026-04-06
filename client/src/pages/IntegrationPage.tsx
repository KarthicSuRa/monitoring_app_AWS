import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '../components/layout/Header';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { getTopics, getWebhookSources, addWebhookSource, deleteWebhookSource } from '../lib/api';
import { type User, type Topic, type WebhookSource, type Notification } from '../types';
import { format } from 'date-fns';

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

// Public endpoint: external systems POST alerts to /notifications (no auth required)
const webhookBaseUrl = `${import.meta.env.VITE_API_URL?.replace(/\/$/, '')}/notifications`;


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
            setSources(sourcesData ? sourcesData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : []);
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

    const renderTable = () => {
        if (sources.length === 0) {
            return (
                <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
                    <Icon name="webhook" className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold text-foreground">Your Integration Hub is Empty</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Get started by creating your first webhook integration.</p>
                    <Button onClick={() => setIsCreating(true)} className="mt-6">
                        <Icon name="plus" className="w-4 h-4 mr-2"/> Add Integration
                    </Button>
                </div>
            );
        }

        return (
             <div className="bg-card border dark:bg-gray-800 rounded-lg shadow border-border dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border dark:divide-gray-700">
                        <thead className="bg-muted/50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Webhook URL</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Posts to Topic</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Created</th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-card dark:bg-gray-800 divide-y divide-border dark:divide-gray-700">
                            {sources.map(source => {
                                const typeInfo = sourceTypeMap.get(source.source_type) || sourceTypeMap.get('generic')!;
                                const webhookUrl = getWebhookUrl(source.id);
                                return (
                                    <tr key={source.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className={`w-10 h-10 rounded-lg ${typeInfo.color} bg-opacity-10 flex items-center justify-center mr-4`}>
                                                    <Icon name={typeInfo.icon} className={`w-5 h-5 ${typeInfo.color}`} />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-foreground">{source.name}</div>
                                                    <div className="text-sm text-muted-foreground">{source.description || typeInfo.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                             <div className="flex items-center gap-2">
                                                <code className="text-sm font-mono text-primary/80 bg-muted p-2 rounded-md w-full max-w-xs overflow-x-auto">{
                                                    webhookUrl.replace('https://','').split('?')[0] + '?source_id=...' + source.id.slice(-4)
                                                }</code>
                                                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(webhookUrl, source.id)}>
                                                    {copiedId === source.id ? <Icon name="check" className="w-4 h-4 text-green-500"/> : <Icon name="copy" className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {source.topic_id && topicMap.has(source.topic_id) ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                                                    <Icon name="tag" className="w-3 h-3 mr-1.5"/>
                                                    {topicMap.get(source.topic_id)}
                                                </span>
                                            ) : 'Uncategorized'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {format(new Date(source.created_at), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(source.id)} className="text-muted-foreground hover:text-red-500">
                                                <Icon name="trash-2" className="w-4 h-4"/>
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                 </div>
            </div>
        );
    };

    return (
        <>
             <Header {...props} profile={props.user} title="Integrations" />
            <main className="flex-1 overflow-y-auto bg-background md:ml-72">
                <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
 
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold">Integration Hub</h1>
                            <p className="text-muted-foreground mt-1">Connect your tools, amplify your signals. Manage incoming webhooks.</p>
                        </div>
                        {!isCreating && (
                             <Button onClick={() => setIsCreating(true)}>
                                <Icon name="plus" className="w-4 h-4 mr-2"/> Add New Integration
                            </Button>
                        )}
                    </div>

                    {isCreating && (
                         <div className="bg-card border border-border rounded-xl mb-8">
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
                                    <Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>Cancel</Button>
                                    <Button type="submit" disabled={isSubmitting || !formName}>
                                        {isSubmitting ? <><Icon name="loader-2" className="w-4 h-4 animate-spin mr-2"/> Creating...</> : 'Create Integration'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}
                    
                    {isLoading ? (
                        <div className="text-center py-20">
                            <Icon name="loader-2" className="mx-auto h-12 w-12 text-muted-foreground animate-spin" />
                            <p className="mt-4 text-muted-foreground">Loading integrations...</p>
                        </div>
                    ) : renderTable() }
                </div>
            </main>
        </>
    );
};

export default IntegrationPage;
