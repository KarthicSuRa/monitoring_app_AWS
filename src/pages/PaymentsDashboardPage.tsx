
import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Notification, SystemStatusData, Session } from '../types';
import GlobalExecutive from '../components/payments/GlobalExecutive';
import AlertingPanel from '../components/payments/AlertingPanel';
import JapanDeepDive from '../components/payments/JapanDeepDive';
import USDeepDive from '../components/payments/USDeepDive';
import UKDeepDive from '../components/payments/UKDeepDive';
import GermanyDeepDive from '../components/payments/GermanyDeepDive';
import SwitzerlandDeepDive from '../components/payments/SwitzerlandDeepDive';
import KoreaDeepDive from '../components/payments/KoreaDeepDive';
import SingaporeDeepDive from '../components/payments/SingaporeDeepDive';
import CountrySelector from '../components/payments/CountrySelector';
import CollapsibleCard from '../components/ui/CollapsibleCard';

interface PaymentsDashboardPageProps {
  onNavigate: (page: string) => void;
  onLogout: () => Promise<void>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  openSettings: () => void;
  systemStatus: SystemStatusData;
  session: Session | null;
  notifications: Notification[];
}

const countries = [
  { code: 'us', name: 'US', emoji: '🇺🇸' },
  { code: 'uk', name: 'UK', emoji: '🇬🇧' },
  { code: 'de', name: 'Germany', emoji: '🇩🇪' },
  { code: 'ch', name: 'Switzerland', emoji: '🇨🇭' },
  { code: 'jp', name: 'Japan', emoji: '🇯🇵' },
  { code: 'sg', name: 'Singapore', emoji: '🇸🇬' },
  { code: 'kr', name: 'Korea', emoji: '🇰🇷' },
];

const PaymentsDashboardPage: React.FC<PaymentsDashboardPageProps> = ({
  onNavigate,
  onLogout,
  isSidebarOpen,
  setIsSidebarOpen,
  openSettings,
  systemStatus,
  session,
  notifications
}) => {
  const [selectedCountry, setSelectedCountry] = useState('jp');

  const selectedCountryName = countries.find(c => c.code === selectedCountry)?.name || 'Japan';

  const renderCountryDeepDive = () => {
    switch (selectedCountry) {
      case 'us':
        return <USDeepDive />;
      case 'uk':
        return <UKDeepDive />;
      case 'de':
        return <GermanyDeepDive />;
      case 'ch':
        return <SwitzerlandDeepDive />;
      case 'sg':
        return <SingaporeDeepDive />;
      case 'kr':
        return <KoreaDeepDive />;
      case 'jp':
      default:
        return <JapanDeepDive />;
    }
  };

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
        title="Payments Dashboard"
      />
      <main className="flex-1 overflow-y-auto bg-gray-100 md:ml-72">
        <div className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-2">
              <CollapsibleCard title="Global Executive Summary">
                <GlobalExecutive />
              </CollapsibleCard>
            </div>
            <CollapsibleCard title="Current Active Alerts">
              <AlertingPanel />
            </CollapsibleCard>
          </div>

          <div className="mb-6">
             <CollapsibleCard title={`Single Country Deep-Dive: ${selectedCountryName}`}>
                <CountrySelector 
                    countries={countries}
                    selectedCountry={selectedCountry}
                    onCountryChange={setSelectedCountry}
                />
                {renderCountryDeepDive()}
            </CollapsibleCard>
          </div>

          <footer className="text-center mt-8 text-lg font-semibold text-gray-500">
            REAL-TIME &lt; 8s LATENCY
          </footer>
        </div>
      </main>
    </>
  );
};

export default PaymentsDashboardPage;
