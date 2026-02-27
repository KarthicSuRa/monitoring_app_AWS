import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Notification, SystemStatusData, Session } from '../types';
import CountrySelector from '../components/ordershealth/CountrySelector';
import TimeFilter from '../components/ordershealth/TimeFilter';
import TotalOrders from '../components/ordershealth/TotalOrders';
import OrderSuccessRate from '../components/ordershealth/OrderSuccessRate';
import FailedCancelledOrders from '../components/ordershealth/FailedCancelledOrders';
import OrderLifecycleFlow from '../components/ordershealth/OrderLifecycleFlow';
import LiveOrdersFirehose from '../components/ordershealth/LiveOrdersFirehose';
import TimeSinceLastOrder from '../components/ordershealth/TimeSinceLastOrder';
import StuckOrdersTable from '../components/ordershealth/StuckOrdersTable';
import OrderComparison from '../components/ordershealth/OrderComparison';

interface OrdersHealthDashboardPageProps {
  onNavigate: (page: string) => void;
  onLogout: () => Promise<void>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  openSettings: () => void;
  systemStatus: SystemStatusData;
  session: Session | null;
  notifications: Notification[];
}

const OrdersHealthDashboardPage: React.FC<OrdersHealthDashboardPageProps> = ({
  onNavigate,
  onLogout,
  isSidebarOpen,
  setIsSidebarOpen,
  openSettings,
  systemStatus,
  session,
  notifications
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [selectedTime, setSelectedTime] = useState<string>('24h');

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
        title="Orders Health Dashboard"
      />
      <main className="flex-1 overflow-y-auto bg-gray-100 md:ml-72">
        <div className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex justify-between mb-6">
            <CountrySelector selectedCountry={selectedCountry} setSelectedCountry={setSelectedCountry} />
            <TimeFilter selectedTime={selectedTime} setSelectedTime={setSelectedTime} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <TotalOrders selectedCountry={selectedCountry} selectedTime={selectedTime} />
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <OrderLifecycleFlow selectedCountry={selectedCountry} selectedTime={selectedTime} />
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <LiveOrdersFirehose selectedCountry={selectedCountry} selectedTime={selectedTime} />
              </div>
            </div>
            <div className="lg:col-span-1 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                  <OrderSuccessRate selectedCountry={selectedCountry} selectedTime={selectedTime} />
                  <TimeSinceLastOrder selectedCountry={selectedCountry} selectedTime={selectedTime} />
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <FailedCancelledOrders selectedCountry={selectedCountry} selectedTime={selectedTime} />
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <StuckOrdersTable selectedCountry={selectedCountry} selectedTime={selectedTime} />
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <OrderComparison selectedCountry={selectedCountry} selectedTime={selectedTime} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default OrdersHealthDashboardPage;
