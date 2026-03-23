import React, { useMemo, useState } from 'react';
import { Header } from '../components/layout/Header';
import { Notification, AuditLog, SystemStatusData, Comment, User } from '../types';
import { Icon } from '../components/ui/Icon';

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
            // Simplified and safer action determination
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

const getActionStyling = (action: string): { icon: string; color: string } => {
    switch(action) {
        case 'Created': return { icon: 'plus-circle', color: 'text-blue-500' };
        case 'Acknowledged': return { icon: 'check-circle', color: 'text-green-500' };
        case 'Resolved': return { icon: 'shield-check', color: 'text-purple-500' };
        case 'Re-opened': return { icon: 'refresh-cw', color: 'text-yellow-500' };
        case 'Commented': return { icon: 'message-square', color: 'text-gray-500' };
        default: return { icon: 'file-text', color: 'text-gray-400' };
    }
}

export const AuditLogsPage: React.FC<AuditLogsPageProps> = ({ 
    notifications, 
    onNavigate, 
    onLogout, 
    isSidebarOpen, 
    setIsSidebarOpen, 
    openSettings, 
    systemStatus, 
    user, 
    userNames 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [timeFilter, setTimeFilter] = useState('all');

    const filteredLogs = useMemo(() => {
        let logs = generateAuditLogs(notifications, userNames);

        if (timeFilter !== 'all') {
            const now = new Date();
            const filterDate = new Date();
            if (timeFilter === '24h') {
                filterDate.setHours(now.getHours() - 24);
            } else if (timeFilter === '7d') {
                filterDate.setDate(now.getDate() - 7);
            }
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
    }, [notifications, searchTerm, timeFilter, userNames]);

    const getNotificationById = (id: string | null) => id ? notifications.find(n => n.id === id) : undefined;

    return (
    <>
        <Header onLogout={onLogout} notifications={notifications} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} openSettings={openSettings} systemStatus={systemStatus} profile={user} onNavigate={onNavigate} />
        <main className="flex-1 overflow-y-auto bg-background md:ml-72">
            <div className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex items-center mb-6">
                    <button onClick={() => onNavigate('dashboard')} className="p-2 rounded-full hover:bg-muted mr-4">
                        <Icon name="arrow-left" className="h-5 w-5 text-foreground" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>
                        <p className="text-muted-foreground mt-1">A detailed history of all notification events and user actions.</p>
                    </div>
                </div>
                
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="p-4 flex flex-col sm:flex-row gap-4 border-b">
                        <div className="relative flex-grow">
                            <Icon name="search" className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search logs by user, action, or details..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm rounded-md border bg-transparent focus:ring-primary focus:border-primary"
                            />
                        </div>
                        <select
                            value={timeFilter}
                            onChange={e => setTimeFilter(e.target.value)}
                            className="text-sm rounded-md border bg-transparent focus:ring-primary focus:border-primary"
                        >
                            <option value="all">All Time</option>
                            <option value="24h">Last 24 hours</option>
                            <option value="7d">Last 7 days</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-muted-foreground">
                            <thead className="text-xs uppercase bg-muted/50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Timestamp</th>
                                    <th scope="col" className="px-6 py-3">User</th>
                                    <th scope="col" className="px-6 py-3">Action</th>
                                    <th scope="col" className="px-6 py-3">Details</th>
                                    <th scope="col" className="px-6 py-3">Related Alert</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map(log => {
                                    const notification = getNotificationById(log.notification_id);
                                    const { icon, color } = getActionStyling(log.action);
                                    const userName = log.user_id === 'System' ? 'System' : userNames.get(log.user_id) || 'Unknown User';

                                    return (
                                    <tr key={log.id} className="bg-card border-b hover:bg-muted/50">
                                        <td className="px-6 py-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="px-6 py-4 font-medium text-foreground">{userName}</td>
                                        <td className="px-6 py-4">
                                            <span className={`flex items-center gap-2 font-medium ${color}`}>
                                                <Icon name={icon as any} className={`w-4 h-4`} />
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 max-w-sm truncate">{log.details}</td>
                                        <td className="px-6 py-4">
                                            {notification ? (
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground`}>
                                                    {notification.title}
                                                </span>
                                            ) : 'N/A'}
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {filteredLogs.length === 0 && (
                        <div className="text-center py-16 text-muted-foreground">
                            <Icon name="file-text" className="w-12 h-12 mx-auto mb-2" />
                            <p className="font-semibold">No audit logs found.</p>
                            <p className="text-sm mt-1">Try adjusting your search or filter.</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    </>
  );
};