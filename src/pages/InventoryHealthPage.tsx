
import React from 'react';
import { Session } from '@supabase/supabase-js';
import { Header } from '../components/layout/Header';
import { Notification, SystemStatusData } from '../types';
import SkusWithZeroStock from '../components/inventoryhealth/SkusWithZeroStock';
import SkusBelowAts from '../components/inventoryhealth/SkusBelowAts';
import TopSoldOutHeroProducts from '../components/inventoryhealth/TopSoldOutHeroProducts';
import StuckStockTable from '../components/inventoryhealth/StuckStockTable';
import WarehouseMap from '../components/inventoryhealth/WarehouseMap';
import { Dropdown } from '../components/ui/Dropdown';

interface InventoryHealthPageProps {
  session: Session | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  openSettings: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  notifications: Notification[];
  systemStatus: SystemStatusData;
}

const InventoryHealthPage: React.FC<InventoryHealthPageProps> = ({
  session,
  onNavigate,
  onLogout,
  openSettings,
  isSidebarOpen,
  setIsSidebarOpen,
  notifications,
  systemStatus,
}) => {

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
        notifications={notifications} 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        openSettings={openSettings} 
        systemStatus={systemStatus} 
        session={session} 
        title="Inventory Health"
      />
      <main className="flex-1 overflow-y-auto bg-gray-50/80 md:ml-72">
        <div className="max-w-screen-2xl mx-auto p-4 sm:p-5">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Inventory Health</h1>
              <p className="text-sm text-gray-500 mt-1">
                A real-time overview of your stock, from availability to potential issues.
              </p>
            </div>
            <Dropdown buttonText="Dashboards" items={dropdownItems} />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-start gap-5">
            <WarehouseMap />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <SkusWithZeroStock />
                <SkusBelowAts />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-5">
            <TopSoldOutHeroProducts />
            <StuckStockTable />
          </div>
        </div>
      </main>
    </>
  );
};

export default InventoryHealthPage;
