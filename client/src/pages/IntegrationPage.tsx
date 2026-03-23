import React, { Dispatch, SetStateAction } from 'react';
import { Header } from '../components/layout/Header';
import { User, Notification, SystemStatusData } from '../types';
import { Icon } from '../components/ui/Icon';

interface IntegrationPageProps {
  user: User | null;
  onLogout: () => Promise<void>;
  openSettings: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
  notifications: Notification[];
  systemStatus: SystemStatusData;
  onNavigate: (page: string) => void;
}

const IntegrationPage: React.FC<IntegrationPageProps> = ({
  user,
  onLogout,
  openSettings,
  isSidebarOpen,
  setIsSidebarOpen,
  notifications,
  systemStatus,
  onNavigate
}) => {

  return (
    <>
        <Header
            profile={user}
            onLogout={onLogout}
            openSettings={openSettings}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            notifications={notifications}
            systemStatus={systemStatus}
            title="Integrations"
            onNavigate={onNavigate}
        />
        <main className="flex-1 overflow-y-auto bg-background md:ml-72">
             <div className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8 h-full flex flex-col items-center justify-center text-center">
                <div className="bg-card border rounded-2xl p-8 sm:p-12 shadow-sm">
                    <div className="mx-auto mb-6 bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center">
                        <Icon name="webhook" className="w-12 h-12 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">Integrations Hub Coming Soon</h1>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        This section will allow you to connect various third-party services and set up webhook integrations. We are actively developing this feature.
                    </p>
                    <button 
                        onClick={() => onNavigate('dashboard')} 
                        className="mt-8 px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        </main>
    </>
  );
};

export default IntegrationPage;
