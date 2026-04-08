import React, { useMemo, useState } from 'react';
import { Header } from '../components/layout/Header';
import { Notification, AuditLog, SystemStatusData, Comment, User } from '../types';
import { Icon } from '../components/ui/Icon';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuditLogsPageProps {
  notifications: Notification[];
  onNavigate: (page: string) => void;
  onLogout: () => Promise<void>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  openSettings: () => void;
  systemStatus: SystemStatusData;
  user: User | null;
  userNames: Map<string, string>;
}

// ─── Data Generation ────────────────────────────────────────────────────────

const generateAuditLogs = (notifications: Notification[], userNames: Map<string, string>): AuditLog[] => {
    const logs: AuditLog[] = [];

    notifications.forEach(n => {
        logs.push({
            id: `log-create-${n.id}`,
            timestamp: n.created_at,
            user_id: 'System',
            action: 'Created',
            details: `Alert "${n.title}" created with ${n.severity} priority.`,
            notification_id: n.id,
        });

        n.comments.forEach((c: Comment) => {
            let action = 'Commented';
            if (c.text.includes('Status changed to Acknowledged')) action = 'Acknowledged';
            else if (c.text.includes('Status changed to Resolved')) action = 'Resolved';
            else if (c.text.includes('Status changed to Re-opened')) action = 'Re-opened';

            logs.push({
                id: `log-comment-${c.id}`,
                timestamp: c.created_at,
                user_id: c.user_id,
                action: action,
                details: action === 'Commented' ? `Commented: "${c.text}"` : c.text,
                notification_id: n.id,
            });
        });
    });
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

// ─── Helper Components ──────────────────────────────────────────────────────

const getActionStyling = (action: string): { icon: string; color: string; label: string } => {
    switch(action) {
        case 'Created':      return { icon: 'plus-circle',    color: 'text-blue-400',      label: 'Created' };
        case 'Acknowledged': return { icon: 'check-circle',   color: 'text-green-400',     label: 'Acknowledged' };
        case 'Resolved':     return { icon: 'shield-check',   color: 'text-violet-400',    label: 'Resolved' };
        case 'Re-opened':    return { icon: 'refresh-cw',     color: 'text-amber-400',     label: 'Re-opened' };
        case 'Commented':    return { icon: 'message-square', color: 'text-slate-400',     label: 'Commented' };
        default:             return { icon: 'file-text',      color: 'text-slate-500',     label: 'Log' };
    }
}

const AuditLogRow: React.FC<{ log: AuditLog, userName: string, notificationTitle?: string }> = ({ log, userName, notificationTitle }) => {
    const { icon, color, label } = getActionStyling(log.action);
    
    return (
        <tr className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                {new Date(log.timestamp).toLocaleString()}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                {userName}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <span className={`flex items-center gap-2 text-sm font-medium ${color}`}>
                    <Icon name={icon as any} className="w-4 h-4" />
                    {label}
                </span>
            </td>
            <td className="px-6 py-4 text-sm text-slate-400 max-w-md truncate" title={log.details}>
                {log.details}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">
                {notificationTitle ? (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-700/70 text-slate-300">
                        {notificationTitle}
                    </span>
                ) : <span className="text-slate-600">N/A</span>}
            </td>
        </tr>
    );
};

// ─── Main Page Component ────────────────────────────────────────────────────

export const AuditLogsPage: React.FC<AuditLogsPageProps> = (props) => {
    const { notifications, onNavigate, user, userNames } = props;
    const [searchTerm, setSearchTerm] = useState('');
    const [timeFilter, setTimeFilter] = useState('all');

    const auditLogs = useMemo(() => generateAuditLogs(notifications, userNames), [notifications, userNames]);

    const filteredLogs = useMemo(() => {
        let logs = auditLogs;

        if (timeFilter !== 'all') {
            const now = new Date();
            const filterDate = new Date();
            if (timeFilter === '24h') filterDate.setHours(now.getHours() - 24);
            else if (timeFilter === '7d') filterDate.setDate(now.getDate() - 7);
            logs = logs.filter(log => new Date(log.timestamp) > filterDate);
        }

        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            logs = logs.filter(log => {
                const userName = log.user_id === 'System' ? 'System' : userNames.get(log.user_id) || 'Unknown User';
                return (
                    userName.toLowerCase().includes(lowercasedFilter) ||
                    log.action.toLowerCase().includes(lowercasedFilter) ||
                    log.details.toLowerCase().includes(lowercasedFilter)
                );
            });
        }

        return logs;
    }, [auditLogs, searchTerm, timeFilter, userNames]);

    const getNotificationById = (id: string | null) => id ? notifications.find(n => n.id === id) : undefined;

    return (
    <div className="flex flex-col h-screen bg-slate-950 md:ml-72">
        <Header {...props} profile={user} title="Audit Logs" />

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center mb-6">
                    <button onClick={() => onNavigate('dashboard')} className="p-2 rounded-full hover:bg-slate-800 mr-3">
                        <Icon name="arrow-left" className="h-5 w-5 text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
                        <p className="text-slate-400 mt-1">A detailed history of all notification events and user actions.</p>
                    </div>
                </div>
                
                <div className="bg-slate-900/70 backdrop-blur border border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-4 flex flex-col sm:flex-row gap-3 border-b border-slate-800">
                        <div className="relative flex-grow">
                            <Icon name="search" className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search by user, action, or details..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-700 bg-slate-800/50 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <select
                            value={timeFilter}
                            onChange={e => setTimeFilter(e.target.value)}
                            className="text-sm rounded-lg border border-slate-700 bg-slate-800/50 text-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                            <option value="all">All Time</option>
                            <option value="24h">Last 24 hours</option>
                            <option value="7d">Last 7 days</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-800/50 text-xs text-slate-400 uppercase tracking-wider">
                                <tr>
                                    <th scope="col" className="px-6 py-3 font-semibold">Timestamp</th>
                                    <th scope="col" className="px-6 py-3 font-semibold">User</th>
                                    <th scope="col" className="px-6 py-3 font-semibold">Action</th>
                                    <th scope="col" className="px-6 py-3 font-semibold">Details</th>
                                    <th scope="col" className="px-6 py-3 font-semibold">Related Alert</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map(log => (
                                    <AuditLogRow 
                                        key={log.id} 
                                        log={log} 
                                        userName={log.user_id === 'System' ? 'System' : userNames.get(log.user_id) || 'Unknown User'}
                                        notificationTitle={getNotificationById(log.notification_id)?.title}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredLogs.length === 0 && (
                        <div className="text-center py-20 text-slate-500">
                            <Icon name="file-text" className="w-12 h-12 mx-auto mb-4" />
                            <p className="font-semibold text-lg text-slate-400">No Audit Logs Found</p>
                            <p className="text-sm mt-2">Try adjusting your search or time filter.</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    </div>
  );
};