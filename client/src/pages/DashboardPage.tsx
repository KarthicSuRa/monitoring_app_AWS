import React, { useState, useMemo } from 'react';
import L from 'leaflet';
import { Header } from '../components/layout/Header';
import { Notification, SystemStatusData, MonitoredSite, Topic, User, NotificationUpdatePayload } from '../types';
import { StatCards } from '../components/dashboard/StatCards';
import { RecentNotifications } from '../components/dashboard/RecentNotifications';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import ChartsWidget from '../components/dashboard/ChartsWidget';
import SiteMap from '../components/monitoring/SiteMap';
import { Dropdown } from '../components/ui/Dropdown';
import { EventBanner } from '../components/dashboard/EventBanner'; // Import the EventBanner component

interface DashboardPageProps {
  notifications: Notification[] | Notification;
  onNavigate: (page: string) => void;
  onLogout: () => Promise<void>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  openSettings: () => void;
  systemStatus: SystemStatusData;
  user: User | null;
  sites: MonitoredSite[] | MonitoredSite;
  loadingSites: boolean;
  sitesError: string | null;
  onUpdateNotification: (notificationId: string, updates: NotificationUpdatePayload) => Promise<void>;
  onAddComment: (notificationId: string, text: string) => Promise<void>;
  topics: Topic[] | Topic;
  profile: User | null;
}

const REGIONS: Record<string, { center: L.LatLngExpression; zoom: number; filter: (site: MonitoredSite) => boolean; }> = {
    Global: {
        center: [20, 0],
        zoom: 1.1,
        filter: (site) => !!site.latitude && !!site.longitude,
    },
    Europe: {
        center: [50.1109, 10.1348],
        zoom: 3.2,
        filter: (site) => !!site.latitude && !!site.longitude && site.latitude > 35 && site.latitude < 70 && site.longitude > -10 && site.longitude < 40,
    },
    'North America': {
        center: [40, -100],
        zoom: 2.8,
        filter: (site) => !!site.latitude && !!site.longitude && site.latitude > 25 && site.latitude < 70 && site.longitude > -140 && site.longitude < -50,
    },
    'Asia Pacific': {
        center: [0, 120],
        zoom: 2.1,
        filter: (site) => !!site.latitude && !!site.longitude && site.latitude > -50 && site.latitude < 70 && site.longitude > 60 && site.longitude < 180,
    },
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ 
    notifications, 
    onNavigate, 
    onLogout, 
    isSidebarOpen, 
    setIsSidebarOpen, 
    openSettings, 
    systemStatus, 
    user,
    sites,
    loadingSites,
    sitesError,
    onUpdateNotification,
    onAddComment,
    topics,
    profile
}) => {
    const [activeTab, setActiveTab] = useState('Global');
    const loading = loadingSites || !notifications || !sites || !topics;

    // Sanitize data to ensure it's always an array
    const safeSites = Array.isArray(sites) ? sites : (sites ? [sites] : []);
    const safeNotifications = Array.isArray(notifications) ? notifications : (notifications ? [notifications] : []);
    const safeTopics = Array.isArray(topics) ? topics : (topics ? [topics] : []);

    const { filteredSites, mapCenter, mapZoom } = useMemo(() => {
        const region = REGIONS[activeTab] || REGIONS.Global;
        const filtered = safeSites.filter(region.filter);
        return {
            filteredSites: filtered,
            mapCenter: region.center,
            mapZoom: region.zoom,
        };
    }, [safeSites, activeTab]);

    const siteCount = (regionName: string) => {
        const region = REGIONS[regionName];
        if (!region) return safeSites.filter(REGIONS.Global.filter).length;
        return safeSites.filter(region.filter).length;
    };

    const regions = Object.keys(REGIONS);

    const dropdownItems = [
      { label: 'Payments', onClick: () => onNavigate('payments') },
      { label: 'Orders Health', onClick: () => onNavigate('orders-health') },
      { label: 'Inventory Health', onClick: () => onNavigate('inventory-health') },
    ];

    return (
        <>
            <Header 
                onNavigate={onNavigate} 
                onLogout={onLogout} 
                notifications={safeNotifications} 
                isSidebarOpen={isSidebarOpen} 
                setIsSidebarOpen={setIsSidebarOpen} 
                openSettings={openSettings} 
                systemStatus={systemStatus} 
                profile={user}
                title="Dashboard"
            />
            <main className="flex-1 overflow-y-auto bg-background md:ml-72">
                <div className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">My Dashboard</h1>
                            <p className="text-muted-foreground text-sm sm:text-base mt-1">Welcome back, {user?.email || 'user'}. Here's an overview of your system.</p>
                        </div>
                        <Dropdown buttonText="Dashboards" items={dropdownItems} />
                    </div>
                    
                    {loading ? (
                        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
                            <p className="text-lg text-muted-foreground">Loading dashboard...</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6">
                                <EventBanner />
                            </div>
                            <div className="mt-6">
                                <StatCards notifications={safeNotifications} sites={safeSites} />
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-8">
                                <div className="lg:col-span-3 flex flex-col gap-8 order-2 lg:order-1">
                                    {user && (
                                        <RecentNotifications 
                                            notifications={safeNotifications} 
                                            onUpdateNotification={onUpdateNotification}
                                            onAddComment={onAddComment}
                                            topics={safeTopics}
                                            user={user}
                                        />
                                    )}
                                    <ActivityFeed notifications={safeNotifications} />
                                </div>
                                <div className="lg:col-span-2 flex flex-col gap-8 order-1 lg:order-2">
                                    <div className="bg-card border rounded-lg p-4">
                                        <h2 className="text-xl font-semibold mb-2 px-2">Site Availability</h2>
                                        <div className="border-b border-border mb-4">
                                            <nav className="-mb-px flex space-x-6 px-2 overflow-x-auto">
                                                {regions.map(region => (
                                                    <button
                                                        key={region}
                                                        onClick={() => setActiveTab(region)}
                                                        className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                                                            activeTab === region
                                                            ? 'border-primary text-primary'
                                                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                                        }`}>
                                                        {region} <span className="text-xs text-muted-foreground">({siteCount(region)})</span>
                                                    </button>
                                                ))}
                                            </nav>
                                        </div>
                                        <div className="h-[300px] w-full">
                                           {loadingSites ? (
                                               <div className="flex items-center justify-center h-full"><p>Loading map...</p></div>
                                           ) : (
                                               <SiteMap 
                                                   sites={filteredSites} 
                                                   loading={loadingSites} 
                                                   error={sitesError} 
                                                   center={mapCenter}
                                                   zoom={mapZoom}
                                               />
                                           )}
                                        </div>
                                    </div>
                                     <ChartsWidget notifications={safeNotifications} />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </>
    );
};