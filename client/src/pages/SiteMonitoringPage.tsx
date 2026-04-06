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

// Auto-refresh every 60 seconds so the table/map reflect the latest check result
const AUTO_REFRESH_INTERVAL_MS = 60_000;

// After triggering a manual check, the lambda needs ~20s; poll until status is fresh
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

  // ─── Fetch Sites ──────────────────────────────────────────────────────────
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

  // ─── Initial load + auto-refresh every 60s ────────────────────────────────
  useEffect(() => {
    fetchSites();

    autoRefreshRef.current = setInterval(() => {
      fetchSites(true); // silent refresh — no loading spinner
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [fetchSites]);

  // ─── Stop post-trigger polling ────────────────────────────────────────────
  const stopPollTimer = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollCountRef.current = 0;
  };

  // ─── Trigger Monitoring ───────────────────────────────────────────────────
  const handleTriggerMonitoring = async () => {
    if (isTriggering) return;
    setIsTriggering(true);
    setTriggerStatus('Triggering check…');
    stopPollTimer();

    try {
      await triggerMonitoring();
      setTriggerStatus('Check running… refreshing data shortly');

      // Poll for fresh data after the lambda completes
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

  // ─── Send Test Alert ──────────────────────────────────────────────────────
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

  // ─── Add / Delete site ────────────────────────────────────────────────────
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

  // ─── Derived data ─────────────────────────────────────────────────────────
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

  // Summary stats
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
      <main className="flex-1 overflow-y-auto bg-background md:ml-72">
        <div className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">

          {/* ─── Page Header ───────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
            <div>
              <Button onClick={() => onNavigate('dashboard')} className="mb-3">
                &larr; Back to Dashboard
              </Button>
              <p className="text-sm text-muted-foreground">
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

          {/* ─── Status messages ───────────────────────────────────────────── */}
          {triggerStatus && (
            <div className="mb-4 px-4 py-2 rounded-lg bg-blue-900/30 border border-blue-500/40 text-blue-300 text-sm flex items-center gap-2">
              {isTriggering && <span className="animate-spin inline-block">⟳</span>}
              {triggerStatus}
            </div>
          )}
          {testAlertStatus && (
            <div className={`mb-4 px-4 py-2 rounded-lg border text-sm ${
              testAlertStatus.startsWith('Error')
                ? 'bg-red-900/30 border-red-500/40 text-red-300'
                : 'bg-emerald-900/30 border-emerald-500/40 text-emerald-300'
            }`}>
              {testAlertStatus}
            </div>
          )}

          {/* ─── Stats Bar ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Sites', value: totalSites, color: 'bg-slate-700/50 border-slate-600/50 text-slate-200', dot: 'bg-slate-400' },
              { label: 'Online',      value: onlineSites,  color: 'bg-emerald-900/30 border-emerald-500/40 text-emerald-300', dot: 'bg-emerald-400' },
              { label: 'Offline',     value: offlineSites, color: 'bg-red-900/30 border-red-500/40 text-red-300', dot: 'bg-red-500' },
              { label: 'Unknown',     value: unknownSites, color: 'bg-amber-900/20 border-amber-500/30 text-amber-300', dot: 'bg-amber-400' },
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

          {/* ─── Map + Table card ─────────────────────────────────────────── */}
          <div className="bg-card border rounded-lg p-6">

            {/* Region tabs */}
            <div className="border-b border-border mb-4">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                {Object.keys(REGIONS).map(region => (
                  <button
                    key={region}
                    onClick={() => setActiveTab(region)}
                    className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === region
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
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
                {/* Map */}
                <div className="h-[400px] rounded-lg overflow-hidden mb-6">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">Loading map…</p>
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

                {/* Last refreshed hint */}
                <p className="text-xs text-muted-foreground mb-3">
                  Auto-refreshes every 60s. Last loaded: {new Date().toLocaleTimeString()}
                </p>

                {/* Table */}
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
