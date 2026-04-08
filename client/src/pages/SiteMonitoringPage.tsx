'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import L from 'leaflet';
import { Header } from '../components/layout/Header';
import SiteList from '../components/monitoring/SiteList';
import SiteMap from '../components/monitoring/SiteMap';
import { AddSiteModal } from '../components/monitoring/AddSiteModal';
import { Button } from '../components/ui/Button';
import { type Notification, type SystemStatusData, type User, type MonitoredSite } from '../types';
import { getSites, addSite, deleteSite, triggerMonitoring, sendTestAlert } from '../lib/api';

interface SiteMonitoringPageProps {
  onLogout: () => Promise<void>;
  openSettings: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  notifications: Notification[];
  systemStatus: SystemStatusData;
  onNavigate: (page: string) => void;
  user: User | null;
}

const REGIONS: Record<string, { center: L.LatLngExpression; zoom: number; filter: (site: MonitoredSite) => boolean; }> = {
    Global: {
        center: [20, 0],
        zoom: 1.5,
        filter: (site: MonitoredSite) => !!site.latitude && !!site.longitude,
    },
    Europe: {
        center: [50.1109, 10.1348],
        zoom: 3.5,
        filter: (site: MonitoredSite) => !!site.latitude && !!site.longitude && site.latitude > 35 && site.latitude < 70 && site.longitude > -10 && site.longitude < 40,
    },
    'North America': {
        center: [40, -100],
        zoom: 2.8,
        filter: (site: MonitoredSite) => !!site.latitude && !!site.longitude && site.latitude > 25 && site.latitude < 70 && site.longitude > -140 && site.longitude < -50,
    },
    'Asia Pacific': {
        center: [0, 120],
        zoom: 2.8,
        filter: (site: MonitoredSite) => !!site.latitude && !!site.longitude && site.latitude > -50 && site.latitude < 70 && site.longitude > 60 && site.longitude < 180,
    },
};


const AUTO_REFRESH_INTERVAL_MS = 60_000;

const POST_TRIGGER_POLL_INTERVAL_MS = 5_000;
const POST_TRIGGER_MAX_POLLS = 10;

export const SiteMonitoringPage: React.FC<SiteMonitoringPageProps> = ({
  onLogout,
  openSettings,
  isSidebarOpen,
  setIsSidebarOpen,
  notifications,
  systemStatus,
  onNavigate,
  user,
}) => {
  const [sites, setSites] = useState<MonitoredSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Global');

  // Track trigger state
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);

  // Track test alert state
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testAlertStatus, setTestAlertStatus] = useState<string | null>(null);

  const pollCountRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSites = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const sitesData = await getSites();
      setSites(Array.isArray(sitesData) ? sitesData : []);
    } catch (e: any) {
      setError(`Failed to fetch site status: ${e.message}`);
      console.error('Error fetching site status:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();

    autoRefreshRef.current = setInterval(() => {
      fetchSites(true); // silent refresh — no loading spinner
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [fetchSites]);

  const stopPollTimer = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollCountRef.current = 0;
  };

  const handleTriggerMonitoring = async () => {
    if (isTriggering) return;
    setIsTriggering(true);
    setTriggerStatus('Triggering check…');
    stopPollTimer();

    try {
      await triggerMonitoring();
      setTriggerStatus('Check running… refreshing data shortly');

      pollCountRef.current = 0;
      pollTimerRef.current = setInterval(async () => {
        pollCountRef.current += 1;
        await fetchSites(true);
        setTriggerStatus(`Refreshed (${pollCountRef.current} / ${POST_TRIGGER_MAX_POLLS})`);
        if (pollCountRef.current >= POST_TRIGGER_MAX_POLLS) {
          stopPollTimer();
          setIsTriggering(false);
          setTriggerStatus('✓ Check complete — data is up to date');
          setTimeout(() => setTriggerStatus(null), 4000);
        }
      }, POST_TRIGGER_POLL_INTERVAL_MS);
    } catch (e: any) {
      setTriggerStatus(`Error: ${e.message}`);
      setIsTriggering(false);
      setTimeout(() => setTriggerStatus(null), 5000);
    }
  };

  const handleSendTestAlert = async () => {
    if (isSendingTest) return;
    setIsSendingTest(true);
    setTestAlertStatus('Sending…');
    try {
      await sendTestAlert();
      setTestAlertStatus('✓ Test alert sent! Check your notification bell & push notification.');
    } catch (e: any) {
      setTestAlertStatus(`Error: ${e.message}`);
    } finally {
      setIsSendingTest(false);
      setTimeout(() => setTestAlertStatus(null), 6000);
    }
  };

  const handleAddSite = async (site: Omit<MonitoredSite, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await addSite(site);
      fetchSites();
      setIsAddSiteModalOpen(false);
    } catch (error) {
      console.error('Failed to add site', error);
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    try {
      await deleteSite(siteId);
      fetchSites();
    } catch (error) {
      console.error('Failed to delete site', error);
    }
  };

  const { filteredSites, mapCenter, mapZoom } = useMemo(() => {
    const safeSites = Array.isArray(sites) ? sites : [];
    const region = REGIONS[activeTab] || REGIONS.Global;
    return {
      filteredSites: safeSites.filter(region.filter),
      mapCenter: region.center,
      mapZoom: region.zoom,
    };
  }, [sites, activeTab]);

  const siteCount = (regionName: string) => {
    const safeSites = Array.isArray(sites) ? sites : [];
    const region = REGIONS[regionName];
    if (!region) return 0;
    return safeSites.filter(region.filter).length;
  };

  const totalSites = sites.length;
  const onlineSites = sites.filter(s => s.status === 'online').length;
  const offlineSites = sites.filter(s => s.status === 'offline').length;
  const unknownSites = sites.filter(s => !s.status || s.status === 'unknown').length;

  return (
    <>
      <Header
        onLogout={onLogout}
        openSettings={openSettings}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        notifications={notifications}
        systemStatus={systemStatus}
        title="Site Monitoring"
        onNavigate={onNavigate}
        profile={user}
      />
      <main className="flex-1 overflow-y-auto bg-gray-900 md:ml-72">
        <div className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
            <div>
              <Button onClick={() => onNavigate('dashboard')} className="mb-3">
                &larr; Back to Dashboard
              </Button>
              <p className="text-sm text-gray-400">
                Real-time status and performance across all monitored sites.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleTriggerMonitoring}
                disabled={isTriggering}
                className="w-full sm:w-auto"
              >
                {isTriggering ? '⟳ Checking…' : '▶ Trigger Check'}
              </Button>
              <Button
                onClick={handleSendTestAlert}
                disabled={isSendingTest}
                variant="secondary"
                className="w-full sm:w-auto"
              >
                {isSendingTest ? '⟳ Sending…' : '🔔 Send Test Alert'}
              </Button>
              <Button onClick={() => setIsAddSiteModalOpen(true)} className="w-full sm:w-auto">
                + Add Site
              </Button>
            </div>
          </div>

          {triggerStatus && (
            <div className="mb-4 px-4 py-2 rounded-lg bg-blue-900/50 border border-blue-500/60 text-blue-200 text-sm flex items-center gap-2">
              {isTriggering && <span className="animate-spin inline-block">⟳</span>}
              {triggerStatus}
            </div>
          )}
          {testAlertStatus && (
            <div className={`mb-4 px-4 py-2 rounded-lg border text-sm ${
              testAlertStatus.startsWith('Error')
                ? 'bg-red-900/50 border-red-500/60 text-red-200'
                : 'bg-green-900/50 border-green-500/60 text-green-200'
            }`}>
              {testAlertStatus}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Sites', value: totalSites, color: 'bg-gray-800/60 border-gray-700/70 text-gray-200', dot: 'bg-gray-400' },
              { label: 'Online',      value: onlineSites,  color: 'bg-green-900/50 border-green-500/60 text-green-200', dot: 'bg-green-400' },
              { label: 'Offline',     value: offlineSites, color: 'bg-red-900/50 border-red-500/60 text-red-200', dot: 'bg-red-500' },
              { label: 'Unknown',     value: unknownSites, color: 'bg-yellow-900/50 border-yellow-500/60 text-yellow-200', dot: 'bg-yellow-400' },
            ].map(({ label, value, color, dot }) => (
              <div key={label} className={`rounded-xl p-4 border backdrop-blur flex items-center gap-3 ${color}`}>
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${dot}`} />
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs opacity-70">{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-800/60 border border-gray-700/70 rounded-lg p-6">

            <div className="border-b border-gray-700 mb-4">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                {Object.keys(REGIONS).map(region => (
                  <button
                    key={region}
                    onClick={() => setActiveTab(region)}
                    className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === region
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                    }`}
                  >
                    {region} ({siteCount(region)})
                  </button>
                ))}
              </nav>
            </div>

            {error ? (
              <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
                <p className="text-red-400">{error}</p>
                <Button onClick={() => fetchSites()} variant="secondary">Retry</Button>
              </div>
            ) : (
              <>
                <div className="h-[400px] rounded-lg overflow-hidden mb-6">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">Loading map…</p>
                      </div>
                    </div>
                  ) : (
                    <SiteMap
                      sites={filteredSites}
                      loading={loading}
                      error={error}
                      center={mapCenter}
                      zoom={mapZoom}
                    />
                  )}
                </div>

                <p className="text-xs text-gray-400 mb-3">
                  Auto-refreshes every 60s. Last loaded: {new Date().toLocaleTimeString()}
                </p>

                <SiteList
                  sites={filteredSites}
                  loading={loading}
                  error={null}
                  onSiteDeleted={handleDeleteSite}
                  onNavigate={onNavigate}
                />
              </>
            )}
          </div>
        </div>
      </main>

      <AddSiteModal
        isOpen={isAddSiteModalOpen}
        onClose={() => setIsAddSiteModalOpen(false)}
        onSiteAdded={handleAddSite}
      />
    </>
  );
};