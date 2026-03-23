import React, { useState, useMemo } from 'react';
import { Header } from '../components/layout/Header';
import { Icon } from '../components/ui/Icon';
import { Notification, SystemStatusData, Topic, User } from '../types';
import { 
    differenceInMinutes, 
    subMonths,
    format, 
    isValid, 
    startOfMonth, 
    endOfMonth, 
    eachDayOfInterval
} from 'date-fns';
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

interface AnalyticsPageProps {
  notifications: Notification[];
  user: User | null;
  onNavigate: (page: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onLogout: () => Promise<void>;
  openSettings: () => void;
  systemStatus: SystemStatusData;
  topics: Topic[];
}

// --- Helper Functions ---
const calculateAverageTime = (items: number[]) => {
  if (items.length === 0) return 0;
  return items.reduce((sum, item) => sum + item, 0) / items.length;
};

const formatMinutes = (minutes: number) => {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return `${hours}h ${remainingMinutes}m`;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#9ca3af']; // Pre-defined colors for charts

const CustomTooltip = ({ active, payload, label, month }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-popover text-popover-foreground rounded-md border border-border shadow-lg backdrop-blur-sm">
          <p className="font-bold">{`${month} ${label}`}</p>
          <p>{`Alerts: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: { cx: number, cy: number, midAngle: number, innerRadius: number, outerRadius: number, percent: number }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent * 100 < 5) { // Don't render label for small slices
        return null;
    }

    return (
        <text x={x} y={y} fill="hsl(var(--card-foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ 
    notifications, 
    user,
    onNavigate, 
    isSidebarOpen, 
    setIsSidebarOpen,
    onLogout,
    openSettings,
    systemStatus,
    topics
}) => {
    const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()));
    const [isOtherTopicsModalOpen, setIsOtherTopicsModalOpen] = useState(false);
    const email = user?.email;

    const monthOptions = useMemo(() => {
        const months = [];
        for (let i = 0; i < 6; i++) {
            months.push(subMonths(startOfMonth(new Date()), i));
        }
        return months.reverse();
    }, []);

    const filteredData = useMemo(() => {
        const startDate = startOfMonth(selectedMonth);
        const endDate = endOfMonth(selectedMonth);

        const filteredNotifications = notifications.filter(n => {
            const nDate = new Date(n.timestamp);
            return isValid(nDate) && nDate >= startDate && nDate <= endDate;
        });

        const acknowledgedTimes = filteredNotifications
            .filter(n => n.acknowledgedAt && isValid(new Date(n.acknowledgedAt)))
            .map(n => differenceInMinutes(new Date(n.acknowledgedAt!), new Date(n.timestamp)));

        const resolvedTimes = filteredNotifications
            .filter(n => n.status === 'resolved' && n.resolvedAt && isValid(new Date(n.resolvedAt)))
            .map(n => differenceInMinutes(new Date(n.resolvedAt!), new Date(n.timestamp)));

        const mtta = calculateAverageTime(acknowledgedTimes);
        const mttr = calculateAverageTime(resolvedTimes);
        const totalAlerts = filteredNotifications.length;

        const topicCounts = filteredNotifications.reduce((acc, n) => {
            const topicId = n.topic_id || 'general';
            (acc as any)[topicId] = ((acc as any)[topicId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const sortedTopics = Object.entries(topicCounts)
            .map(([topicId, count]) => {
                const topic = topics.find(t => t.id === topicId);
                return {
                    name: topic ? topic.name : 'General',
                    value: count
                };
            })
            .sort((a, b) => b.value - a.value);

        const MAX_SLICES = 5; // Show top 5 topics + "Other"
        let pieData;
        let otherSlicesForModal: { name: string, value: number }[] = [];

        if (sortedTopics.length > MAX_SLICES) {
            const topSlices = sortedTopics.slice(0, MAX_SLICES);
            const otherSlices = sortedTopics.slice(MAX_SLICES);
            const otherSliceValue = otherSlices.reduce((acc, slice) => acc + slice.value, 0);
            
            pieData = [
                ...topSlices,
                { name: 'Other', value: otherSliceValue }
            ];
            otherSlicesForModal = otherSlices;
        } else {
            pieData = sortedTopics;
        }

        const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
        const dailyAlerts = daysInMonth.map(day => ({
            name: format(day, 'dd'),
            alerts: 0
        }));

        filteredNotifications.forEach(n => {
            const day = format(new Date(n.timestamp), 'dd');
            const entry = dailyAlerts.find(d => d.name === day);
            if (entry) entry.alerts++;
        });

        return { mtta, mttr, totalAlerts, pieData, dailyAlerts, otherSlicesForModal };
    }, [notifications, topics, selectedMonth]);

    const { mtta, mttr, totalAlerts, pieData, dailyAlerts, otherSlicesForModal } = filteredData;

    const handlePieClick = (data: any) => {
        if (data.name === 'Other' && otherSlicesForModal.length > 0) {
            setIsOtherTopicsModalOpen(true);
        }
    };

    const handleGenerateReport = () => {
        const monthName = format(selectedMonth, 'MMMM yyyy');
        // Note: These styles are self-contained for the report and won't use the app's main stylesheet.
        const reportHtml = `
            <html>
            <head>
                <title>Monitoring Report</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 2rem; background-color: #f8fafc; color: #1e293b; }
                    h1, h2 { color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
                    .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
                    .metric { background-color: #ffffff; border: 1px solid #e2e8f0; padding: 1.5rem; text-align: center; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04); }
                    .metric-label { font-size: 0.9rem; color: #64748b; margin-bottom: 0.5rem; }
                    .metric-value { font-size: 2.25em; font-weight: 700; color: #0f172a; }
                </style>
            </head>
            <body>
                <h1>Monitoring Report - ${monthName}</h1>
                <p>Generated for ${email || 'N/A'} on: ${new Date().toLocaleDateString()}</p>
                
                <div class="metric-grid">
                    <div class="metric">
                        <div class="metric-label">Total Alerts</div>
                        <div class="metric-value">${totalAlerts}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Mean Time to Acknowledge</div>
                        <div class="metric-value">${formatMinutes(mtta)}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Mean Time to Resolution</div>
                        <div class="metric-value">${formatMinutes(mttr)}</div>
                    </div>
                </div>
            </body>
            </html>
        `;
        const blob = new Blob([reportHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    return (
    <>
        <Header onLogout={onLogout} notifications={notifications} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} openSettings={openSettings} systemStatus={systemStatus} profile={user} onNavigate={onNavigate} />
        <main className="flex-1 overflow-y-auto bg-background md:ml-72">
            <div className="max-w-screen-xl mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between mb-8">
                    <div className="flex items-center">
                        <button onClick={() => onNavigate('dashboard')} className="p-2 rounded-full hover:bg-muted mr-4">
                            <Icon name="arrow-left" className="h-5 w-5 text-foreground" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Analytics & Reporting</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                System and team performance insights for {format(selectedMonth, 'MMMM yyyy')}.
                            </p>
                        </div>
                    </div>
                    <button onClick={handleGenerateReport} className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
                        <Icon name="file-text" className="w-4 h-4" />
                        Generate Report
                    </button>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard icon="bell" title="Total Alerts" value={totalAlerts.toString()} />
                    <StatCard icon="check-circle" title="Mean Time to Acknowledge" value={formatMinutes(mtta)} />
                    <StatCard icon="shield-check" title="Mean Time to Resolution" value={formatMinutes(mttr)} />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3 bg-card text-card-foreground p-6 rounded-xl border">
                        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                            <h3 className="text-lg font-semibold">Alerts in {format(selectedMonth, 'MMMM')}</h3>
                            <div className="flex items-center gap-2 flex-wrap">
                                {monthOptions.map((month: Date) => (
                                    <button
                                        key={month.getTime()}
                                        onClick={() => setSelectedMonth(month)}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                            selectedMonth.getTime() === month.getTime()
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}>
                                        {format(month, 'MMM yy')}
                                    </button>
                                ))}
                            </div>
                        </div>
                         <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={dailyAlerts} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" padding={{ left: 10, right: 10 }}/>
                                <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" allowDecimals={false}/>
                                <Tooltip content={<CustomTooltip month={format(selectedMonth, 'MMM')} />} cursor={{ fill: 'hsl(var(--muted))' }} />
                                <Bar dataKey="alerts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                         </ResponsiveContainer>
                    </div>
                     <div className="lg:col-span-2 bg-card text-card-foreground p-6 rounded-xl border">
                         <h3 className="text-lg font-semibold mb-4">Alerts by Topic</h3>
                         {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie 
                                        data={pieData} 
                                        dataKey="value" 
                                        nameKey="name" 
                                        cx="50%" 
                                        cy="50%" 
                                        outerRadius={110} 
                                        labelLine={false}
                                        label={renderCustomizedLabel}
                                        onClick={handlePieClick}
                                        style={{ cursor: otherSlicesForModal.length > 0 ? 'pointer' : 'default' }}
                                    >
                                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="hsl(var(--card))" />)}
                                    </Pie>
                                    <Tooltip formatter={(value, name) => [value, name]} />
                                    <Legend wrapperStyle={{ fontSize: '12px' }}/>
                                </PieChart>
                            </ResponsiveContainer>
                         ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">No data available for this period.</div>
                         )}
                    </div>
                </div>
            </div>
             <OtherTopicsModal
                isOpen={isOtherTopicsModalOpen}
                onClose={() => setIsOtherTopicsModalOpen(false)}
                data={otherSlicesForModal}
            />
        </main>
    </>
  );
};


const OtherTopicsModal: React.FC<{ isOpen: boolean; onClose: () => void; data: { name: string; value: number }[] }> = ({ isOpen, onClose, data }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 transition-opacity animate-fade-in-fast" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-xl p-6 w-full max-w-md m-4 animate-scale-up border" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-card-foreground">Other Topics</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
                        <Icon name="x" className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {data.sort((a,b) => b.value - a.value).map((topic, index) => (
                        <div key={index} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-muted/50">
                            <span className="text-muted-foreground truncate pr-4">{topic.name}</span>
                            <span className="font-semibold text-foreground bg-muted px-2 py-1 rounded-md">{topic.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{icon: string, title: string, value: string}> = ({ icon, title, value }) => (
    <div className="bg-card text-card-foreground p-5 rounded-xl border flex items-center gap-4">
        <div className="bg-primary/10 p-3 rounded-full">
            <Icon name={icon as any} className="w-6 h-6 text-primary" />
        </div>
        <div>
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        </div>
    </div>
);
