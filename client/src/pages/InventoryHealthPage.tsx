import React from 'react';
import { Header } from '../components/layout/Header';
import { Notification, SystemStatusData, User } from '../types';
import { Icon } from '../components/ui/Icon';

interface InventoryHealthPageProps {
  user: User | null;
  onNavigate: (path: string) => void;
  onLogout: () => Promise<void>;
  openSettings: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  notifications: Notification[];
  systemStatus: SystemStatusData;
}

const InventoryHealthPage: React.FC<InventoryHealthPageProps> = ({
  user,
  onNavigate,
  onLogout,
  openSettings,
  isSidebarOpen,
  setIsSidebarOpen,
  notifications,
  systemStatus,
}) => {

  return (
    <>
      <Header 
        onNavigate={onNavigate} 
        onLogout={onLogout} 
        notifications={notifications} 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        openSettings={openSettings} 
        systemStatus={systemStatus} 
        profile={user} 
        title="Inventory Health"
      />
      <main className="flex-1 overflow-y-auto bg-background md:ml-72">
         <div className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8 h-full flex flex-col items-center justify-center text-center">
            <div className="bg-card border rounded-2xl p-8 sm:p-12 shadow-sm">
                <div className="mx-auto mb-6 bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center">
                    <Icon name="inventory" className="w-12 h-12 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Inventory Health Dashboard Coming Soon</h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                    This dashboard will provide a real-time overview of your stock, from availability to potential issues. We are currently building this feature.
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

export default InventoryHealthPage;
