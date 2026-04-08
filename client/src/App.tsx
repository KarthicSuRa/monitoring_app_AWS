
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LandingPage } from './pages/LandingPage';
import { CognitoLoginPage } from './pages/CognitoLoginPage';
import { CognitoSignUpPage } from './pages/CognitoSignUpPage';
import { CognitoConfirmSignUpPage } from './pages/CognitoConfirmSignUpPage';
import { CognitoForgotPasswordPage } from './pages/CognitoForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { ApiDocsPage } from './pages/ApiDocsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { TopicManagerPage } from './pages/TopicManagerPage';
import { CalendarPage } from './pages/CalendarPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SiteMonitoringPage } from './pages/SiteMonitoringPage';
import EmailsPage from './pages/EmailsPage';
import PaymentsDashboardPage from './pages/PaymentsDashboardPage';
import OrdersHealthDashboardPage from './pages/OrdersHealthDashboardPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import InventoryHealthPage from './pages/InventoryHealthPage';
import OrderMonitoringPage from './pages/OrderMonitoringPage';
import { Sidebar } from './components/layout/Sidebar';
import IntegrationPage from './pages/IntegrationPage';
import { SettingsModal } from './components/layout/SettingsModal';
import { NotificationToast } from './components/ui/NotificationToast';
import { Theme, type Notification, SystemStatusData, NotificationUpdatePayload, Topic, MonitoredSite, User, Comment, Severity } from './types';
import { ThemeContext } from './contexts/ThemeContext';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { SiteDetailPage } from './pages/monitoring/SiteDetailPage';
import UserManagementPage from './pages/UserManagementPage';
import ProfilePage from './pages/Profile';
import SyntheticMonitoringPage from './pages/monitoring/SyntheticMonitoringPage';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { getCurrentUser, signOut } from './lib/cognitoClient';
import { CognitoUserSession } from 'amazon-cognito-identity-js';
import { onMessage } from 'firebase/messaging';
import { messaging } from './lib/firebase'; // Ensure you export 'messaging' from your firebase.ts
import { 
  getNotifications, 
  getTopics, 
  getSites, 
  addComment as apiAddComment, 
  updateNotification as apiUpdateNotification, 
  addTopic as apiAddTopic, 
  deleteTopic as apiDeleteTopic, 
  toggleTopicSubscription,
  sendTestAlert as apiSendTestAlert,
  connectWebSocket,
  subscribePushNotification
} from './lib/api';
import { requestForToken, onMessageListener } from './lib/firebase';

function App() {
  const [theme, setTheme] = useState<Theme>('light');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [snoozedUntil, setSnoozedUntil] = useState<Date | null>(null);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [sites, setSites] = useState<MonitoredSite[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [sitesError, setSitesError] = useState<string | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const dataFetched = useRef(false);
  const hasConnectedRef = useRef(false);
  const notificationHandlerRef = useRef<(n: Notification) => void>();

  const currentPage = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/site-monitoring') || path.startsWith('/monitoring')) return 'site-monitoring';
    if (path.startsWith('/api-docs')) return 'api-docs';
    if (path.startsWith('/emails')) return 'emails';
    if (path.startsWith('/audit-logs')) return 'audit-logs';
    if (path.startsWith('/how-it-works')) return 'how-it-works';
    if (path.startsWith('/calendar')) return 'calendar';
    if (path.startsWith('/analytics')) return 'analytics';
    if (path.startsWith('/topic-manager')) return 'topic-manager';
    if (path.startsWith('/integrations')) return 'integrations';
    if (path.startsWith('/user-management')) return 'user-management';
    if (path.startsWith('/order-monitoring')) return 'order-monitoring';
    return 'dashboard';
  }, [location.pathname]);

  const addToast = useCallback((notification: Notification) => {
    setToasts(prev => [{ ...notification, id: `toast-${notification.id}-${Date.now()}` }, ...prev]);
  }, []);

  const addSimpleToast = useCallback((toast: { id: string; title: string; message: string; severity: Severity; }) => {
    const notification: Notification = {
        ...toast,
        type: 'local',
        status: 'new',
        timestamp: new Date().toISOString(),
        site: null,
        comments: [],
        topic_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    addToast(notification);
}, [addToast]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const systemStatus: SystemStatusData = useMemo(() => ({
    status: 'operational',
    message: 'All systems normal',
    last_updated: new Date().toISOString(),
    service: 'Ready',
    database: 'Connected',
    push: 'SNS',
    subscription: isPushEnabled ? 'Active' : 'Inactive',
  }), [isPushEnabled]);

  const handleNewNotification = useCallback((notification: Notification) => {
    console.log('🔔 Handling new notification:', notification.title);
    setNotifications(prev => {
        if (prev.some(n => n.id === notification.id)) {
            return prev;
        }
        return [notification, ...prev];
    });
    addToast(notification);

    if (soundEnabled) {
      try {
        const audio = new Audio('/alert.wav');
        audio.play().catch(e => console.error("Audio play failed:", e));
      } catch (error: any) {
        console.error("Error playing sound:", error);
      }
    }
  }, [soundEnabled, addToast]);

    notificationHandlerRef.current = handleNewNotification;

    useEffect(() => {
      const handlePushMessage = (event: MessageEvent) => {
          if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
              console.log('📨 Received push message from service worker:', event.data.notification);
              notificationHandlerRef.current?.(event.data.notification);
          }
      };
  
      navigator.serviceWorker.addEventListener('message', handlePushMessage);
  
      return () => {
          navigator.serviceWorker.removeEventListener('message', handlePushMessage);
      };
    }, []);

    useEffect(() => {
      if (!profile || hasConnectedRef.current) return;
      hasConnectedRef.current = true;

      const cleanup = connectWebSocket((notification) => {
        notificationHandlerRef.current?.(notification);
      });
  
      return cleanup;
    }, [profile]);

  const fetchInitialData = useCallback(async () => {
    if (dataFetched.current) return;
    setDataLoading(true);
    setProfileLoading(true);
    try {
      console.log('📊 Fetching initial data...');
      const [notificationsData, topicsData, sitesData] = await Promise.all([
        getNotifications(),
        getTopics(),
        getSites()
      ]);
      
      setNotifications(notificationsData || []);
      const mappedTopics = topicsData.map((t: any) => ({ ...t, subscribed: t.is_subscribed }));
      setTopics(mappedTopics || []);
      setSites(sitesData || []);
      console.log('✅ Initial data fetched successfully');
      dataFetched.current = true;
    } catch (error: any) {
      console.error('❌ Error fetching initial data:', error);
      setProfileError('Failed to load dashboard data. Please try again later.');
    } finally {
      setDataLoading(false);
      setProfileLoading(false);
      setLoadingSites(false);
    }
  }, []);

  const checkSession = useCallback(async () => {
    setAuthLoading(true);
    try {
      const userSession: CognitoUserSession | null = await getCurrentUser();
      if (userSession) {
        const idToken = userSession.getIdToken().getJwtToken();
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        setProfile({
            id: payload.sub,
            full_name: payload.name || 'Anonymous User',
            email: payload.email,
            avatar_url: payload.picture,
            app_role: 'super_admin'
        });
        await fetchInitialData();
      }
    } catch (error: any) {
      console.warn("No active session:", error);
    } finally {
      setAuthLoading(false);
    }
  }, [fetchInitialData]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setIsPushLoading(true);
    let unsubscribeFromOnMessage: (() => void) | undefined;

    const setupPushNotifications = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push messaging is not supported');
        setIsPushEnabled(false);
        setIsPushLoading(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('SW registration successful');
        
        const token = await requestForToken(registration);
        setIsPushEnabled(!!token);

        if (token) {
          try {
            await subscribePushNotification(token);
            console.log('✅ FCM token registered with backend successfully.');
          } catch (backendErr) {
            console.error('❌ Failed to register push token with backend:', backendErr);
          }
        }

        unsubscribeFromOnMessage = onMessage(messaging, (payload: any) => {
          console.log('Received foreground message: ', payload);
          const notification: Notification = {
            id: payload.messageId || `fg-${Date.now()}`,
            title: payload.notification?.title || payload.data?.title || 'Notification',
            message: payload.notification?.body || payload.data?.message || '',
            severity: (payload.data?.severity as Severity) || 'high',
            type: 'push',
            timestamp: new Date().toISOString(),
            site: null,
            comments: [],
            topic_id: payload.data?.topic_id || null,
            status: 'new',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          handleNewNotification(notification);
        });

      } catch (err) {
        console.error('An error occurred while setting up push notifications. ', err);
        setIsPushEnabled(false);
      } finally {
        setIsPushLoading(false);
      }
    };

    setupPushNotifications();

    return () => {
      if (unsubscribeFromOnMessage) {
        unsubscribeFromOnMessage();
      }
    };
  }, [profile, handleNewNotification]);
  
  const handleLoginSuccess = useCallback(async () => {
      setAuthLoading(true);
      try {
        const userSession: CognitoUserSession | null = await getCurrentUser();
         if (userSession) {
            const idToken = userSession.getIdToken().getJwtToken();
            const payload = JSON.parse(atob(idToken.split('.')[1]));
            setProfile({
                id: payload.sub,
                full_name: payload.name,
                email: payload.email,
                avatar_url: payload.picture,
                app_role: 'super_admin'
            });
            await fetchInitialData();
        }
        navigate('/');
      } catch (error: any) {
        console.error("Error fetching session after login:", error);
      } finally {
        setAuthLoading(false);
      }
  }, [fetchInitialData, navigate]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleSignUpSuccess = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  const handleLogout = useCallback(async () => {
    console.log('➡️ Starting logout process...');
    signOut();

    setProfile(null);
    dataFetched.current = false;
    hasConnectedRef.current = false;
    setNotifications([]);
    setTopics([]);
    setSites([]);
    setToasts([]);
    setIsPushEnabled(false);
    navigate('/');
    console.log('➡️ Client-side logout complete');
  }, [navigate]);

  const handleNavigate = useCallback((page: string) => {
    if (profile) {
      navigate(page);
    }
    setIsSidebarOpen(false);
  }, [profile, navigate]);
  
  const sendTestAlert = useCallback(async () => {
    try {
      console.log('🚀 Sending test alert...');
      await apiSendTestAlert();
      console.log('✅ Test alert request sent successfully.');
      addToast({
        id: `local-${Date.now()}`,
        title: 'Test Alert Triggered',
        message: 'The test alert was successfully sent. You should receive a push notification and an in-app notification shortly.',
        severity: 'low',
        type: 'manual',
        timestamp: new Date().toISOString(),
        site: null,
        comments: [],
        topic_id: null,
        status: 'new',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Notification);
    } catch (error: any) {
      console.error('❌ Failed to send test alert:', error);
      alert(`Failed to send test alert: ${error.message}`);
    }
  }, [addToast]);

  const addComment = useCallback(async (notificationId: string, text: string) => {
    if (!profile) return;

    try {
        const newComment = await apiAddComment(notificationId, { text });
        setNotifications(prev => 
            prev.map(n => 
                n.id === notificationId 
                ? { ...n, comments: [...(n.comments || []), newComment] as Comment[] } 
                : n
            )
        );
    } catch (error: any) {
        console.error("❌ Error adding comment:", error);
        alert('Failed to add comment. Please try again.');
    }
  }, [profile]);

  const updateNotification = useCallback(async (notificationId: string, updates: NotificationUpdatePayload) => {
    const originalNotifications = notifications;
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, ...updates } : n));

    try {
      await apiUpdateNotification(notificationId, updates);
    } catch (error: any) {
      console.error("❌ Database update failed, reverting:", error);
      setNotifications(originalNotifications);
      alert('Failed to update notification.');
    }
  }, [notifications]);
  
  const handleAddTopic = useCallback(async (name: string, description: string) => {
    try {
      const newTopic = await apiAddTopic({ name, description });
      setTopics(prev => [...prev, { ...newTopic, subscribed: false }]);
    } catch (error: any) {
      console.error("Error adding topic:", error);
      alert(`Failed to add topic: ${(error as Error).message}`);
    }
  }, []);

  const handleToggleSubscription = useCallback(async (topic: Topic) => {
    const isSubscribing = !topic.subscribed;
    setTopics(prev => prev.map(t => t.id === topic.id ? { ...t, subscribed: isSubscribing } : t));
    try {
      await toggleTopicSubscription(topic.id);
    } catch (error: any) {
      console.error('Error toggling subscription:', error);
      alert('Failed to update subscription. Please try again.');
      setTopics(prev => prev.map(t => t.id === topic.id ? { ...t, subscribed: !isSubscribing } : t));
    }
  }, []);

  const handleDeleteTopic = useCallback(async (topic: Topic) => {
    const originalTopics = topics;
    setTopics(prev => prev.filter(t => t.id !== topic.id));
    try {
      await apiDeleteTopic(topic.id);
    } catch (error: any) {
      console.error("Error deleting topic:", error);
      alert(`Failed to delete topic: ${(error as Error).message}`);
      setTopics(originalTopics);
    }
  }, [topics]);
  
  const handleClearLogs = useCallback(async () => {
    alert('Clearing logs is not implemented in this version.');
  }, []);

  const themeContextValue = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  if (authLoading) {
    return (
      <ThemeContext.Provider value={themeContextValue}>
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ThemeContext.Provider>
    );
  }

  if (!profile) {
    return (
      <ThemeContext.Provider value={themeContextValue}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<CognitoLoginPage onLoginSuccess={handleLoginSuccess} />} />
          <Route path="/signup" element={<CognitoSignUpPage />} />
          <Route path="/confirm-signup" element={<CognitoConfirmSignUpPage onSignUpSuccess={handleSignUpSuccess} />} />
          <Route path="/forgot-password" element={<CognitoForgotPasswordPage />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </ThemeContext.Provider>
    );
  }
  
  return (
    <ThemeContext.Provider value={themeContextValue}>
      <div className="min-h-screen font-sans text-foreground">
        <ErrorBoundary>
          <div className="h-screen flex">
            <Sidebar 
              currentPage={currentPage} 
              onNavigate={handleNavigate} 
              isSidebarOpen={isSidebarOpen} 
              setIsSidebarOpen={setIsSidebarOpen}
              onSendTestAlert={sendTestAlert}
              topics={topics}
              profile={profile}
            />
            <div className="flex-1 flex flex-col w-full">
              <Routes>
                <Route path="/monitoring/:id" element={<SiteDetailPage user={profile} onLogout={handleLogout} openSettings={() => setIsSettingsOpen(true)} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} notifications={notifications} systemStatus={systemStatus} onNavigate={handleNavigate}/>} />
                <Route path="/site-monitoring" element={<SiteMonitoringPage user={profile} onLogout={handleLogout} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} notifications={notifications} openSettings={() => setIsSettingsOpen(true)} systemStatus={systemStatus} onNavigate={handleNavigate}/>}/>
                <Route path="/api-docs" element={ <ApiDocsPage user={profile} onLogout={handleLogout} onNavigate={handleNavigate} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} notifications={notifications} openSettings={() => setIsSettingsOpen(true)} systemStatus={systemStatus} /> } />
                <Route path="/audit-logs" element={ <AuditLogsPage user={profile} onLogout={handleLogout} onNavigate={handleNavigate} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} notifications={notifications} openSettings={() => setIsSettingsOpen(true)} systemStatus={systemStatus} userNames={new Map()} /> } />
                <Route path="/how-it-works" element={ <HowItWorksPage user={profile} onLogout={handleLogout} onNavigate={handleNavigate} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} notifications={notifications} openSettings={() => setIsSettingsOpen(true)} systemStatus={systemStatus} /> } />
                <Route path="/integrations" element={<IntegrationPage user={profile} onLogout={handleLogout} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} notifications={notifications} openSettings={() => setIsSettingsOpen(true)} systemStatus={systemStatus} onNavigate={handleNavigate}/>}/>
                <Route path="/user-management" element={<UserManagementPage user={profile} onLogout={handleLogout} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} notifications={notifications} openSettings={() => setIsSettingsOpen(true)} systemStatus={systemStatus} onNavigate={handleNavigate} topics={topics} onUpdateTopicTeam={async () => {}} />}/>
                <Route path="/calendar" element={ <CalendarPage user={profile} onLogout={handleLogout} onNavigate={handleNavigate} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} notifications={notifications} openSettings={() => setIsSettingsOpen(true)} systemStatus={systemStatus} /> } />
                <Route path="/synthetic-monitoring" element={<SyntheticMonitoringPage />}/>
                <Route path="/emails" element={<EmailsPage user={profile} onLogout={handleLogout} onNavigate={handleNavigate} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} notifications={notifications} openSettings={() => setIsSettingsOpen(true)} systemStatus={systemStatus} />} />
                <Route path="/payments" element={<PaymentsDashboardPage user={profile} onLogout={handleLogout} onNavigate={handleNavigate} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} notifications={notifications} openSettings={() => setIsSettingsOpen(true)} systemStatus={systemStatus} />} />
                <Route path="/orders-health" element={<OrdersHealthDashboardPage user={profile} onLogout={handleLogout} onNavigate={handleNavigate} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} notifications={notifications} openSettings={() => setIsSettingsOpen(true)} systemStatus={systemStatus} />} />
                <Route path="/inventory-health" element={<InventoryHealthPage user={profile} onLogout={handleLogout} onNavigate={handleNavigate} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} notifications={notifications} openSettings={() => setIsSettingsOpen(true)} systemStatus={systemStatus} />} />
                <Route path="/order-tracking/:orderId" element={<OrderTrackingPage user={profile} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} onLogout={handleLogout} onNavigate={handleNavigate} notifications={notifications} openSettings={() => setIsSettingsOpen(true)} systemStatus={systemStatus} />} />
                <Route path="/order-monitoring" element={<OrderMonitoringPage />} />
                {profile && <Route path="/analytics" element={ <AnalyticsPage user={profile} onLogout={handleLogout} onNavigate={handleNavigate} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} notifications={notifications} openSettings={() => setIsSettingsOpen(true)} systemStatus={systemStatus} topics={topics} /> } />}
                <Route path="/topic-manager" element={<TopicManagerPage onLogout={handleLogout} onNavigate={handleNavigate} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} notifications={notifications} openSettings={() => setIsSettingsOpen(true)} systemStatus={systemStatus} onAddTopic={handleAddTopic} onToggleSubscription={handleToggleSubscription} onDeleteTopic={handleDeleteTopic} topics={topics} profile={profile} />}/>
                <Route path="/profile" element={<ProfilePage profile={profile} addToast={addSimpleToast} onNavigate={handleNavigate} />} />
                <Route path="*" element={(() => {
                  if (profileLoading || dataLoading) {
                    return (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                          <p>Loading Your Dashboard...</p>
                        </div>
                      </div>
                    );
                  }

                  if (profileError) {
                    return (
                      <div className="flex-1 flex items-center justify-center p-4">
                        <div className="text-center p-6 bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-lg max-w-md">
                          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Dashboard Unavailable</h3>
                          <p className="text-red-600 dark:text-red-300 mt-2">{profileError}</p>
                          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Try Again</button>
                        </div>
                      </div>
                    );
                  }

                  return (
                      <DashboardPage
                        onLogout={handleLogout}
                        onNavigate={handleNavigate}
                        isSidebarOpen={isSidebarOpen}
                        setIsSidebarOpen={setIsSidebarOpen}
                        notifications={notifications}
                        openSettings={() => setIsSettingsOpen(true)}
                        systemStatus={systemStatus}
                        topics={topics}
                        onUpdateNotification={updateNotification}
                        onAddComment={addComment}
                        sites={sites}
                        loadingSites={loadingSites}
                        sitesError={sitesError}
                        user={profile}
                        profile={profile}
                      />
                    );
                })()}/>
              </Routes>
            </div>
          </div>

          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            snoozedUntil={snoozedUntil}
            setSnoozedUntil={setSnoozedUntil}
            isPushEnabled={isPushEnabled}
            setIsPushEnabled={setIsPushEnabled}
            isPushLoading={isPushLoading}
            setIsPushLoading={setIsPushLoading}
          />
        </ErrorBoundary>
      </div>
      
      <div aria-live="assertive" className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-[100]">
        <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
          {toasts.map(toast => (
            <NotificationToast key={toast.id} notification={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

export default App;
