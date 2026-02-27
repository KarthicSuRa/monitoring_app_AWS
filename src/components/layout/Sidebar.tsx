
import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import { Topic } from '../../types';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  onSendTestAlert: () => void;
  topics: Topic[];
  profile: any | null;
}

const navItems = [
  {
    name: 'Dashboards', 
    icon: 'dashboard', 
    subItems: [
      { name: 'Alerts', page: 'dashboard' },
      { name: 'Payments', page: 'payments' },
      { name: 'Orders Health', page: 'orders-health' },
      { name: 'Inventory Health', page: 'inventory-health' },
      { name: 'Order Tracking', page: 'order-tracking' },
    ]
  },
  { name: 'Calendar', icon: 'calendar-view', page: 'calendar' },
  { name: 'Site Monitoring', icon: 'monitor', page: 'site-monitoring' },
  { name: 'Synthetic Monitoring', icon: 'bot', page: 'synthetic-monitoring' },
  { name: 'Integrations', icon: 'zap', page: 'integrations' },
  { name: 'Analytics', icon: 'analytics-pie', page: 'analytics' },
  { name: 'Topic Subscriptions', icon: 'topic', page: 'topic-manager' },
  { name: 'API Docs', icon: 'docs', page: 'api-docs' },
  { name: 'Audit Logs', icon: 'logs', page: 'audit-logs' },
  { name: 'How It Works', icon: 'info', page: 'how-it-works' },
];

const NavItem: React.FC<{ 
  item: any; 
  currentPage: string; 
  onNavigate: (page: string) => void; 
}> = ({ item, currentPage, onNavigate }) => {
  const hasSubItems = item.subItems && item.subItems.length > 0;
  const isParentActive = hasSubItems && item.subItems.some((sub: any) => sub.page === currentPage);
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(isParentActive);

  const handleToggle = () => {
    if (hasSubItems) {
      setIsSubMenuOpen(!isSubMenuOpen);
    }
  };

  return (
    <div>
      <a
        href="#"
        onClick={(e) => { 
          e.preventDefault(); 
          if (hasSubItems) {
            handleToggle();
          } else {
            onNavigate(item.page);
          }
        }}
        className={`flex items-center justify-between gap-4 rounded-md px-3 py-3 text-base font-medium transition-all ${
          (currentPage === item.page || isParentActive)
            ? 'bg-slate-800 text-white'
            : 'hover:bg-slate-700/50 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-4">
          <Icon name={item.icon} className="h-6 w-6" />
          {item.name}
        </div>
        {hasSubItems && (
          <Icon name={isSubMenuOpen ? 'chevron-up' : 'chevron-down'} className="h-5 w-5" />
        )}
      </a>
      {hasSubItems && isSubMenuOpen && (
        <div className="pl-8 pt-2 space-y-1">
          {item.subItems.map((subItem: any) => (
            <a
              key={subItem.name}
              href="#"
              onClick={(e) => { e.preventDefault(); onNavigate(subItem.page); }}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                currentPage === subItem.page
                  ? 'text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {subItem.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ 
    currentPage, 
    onNavigate, 
    isSidebarOpen, 
    setIsSidebarOpen,
    onSendTestAlert,
    profile
}) => {
    return (
        <>
            {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
            <aside 
                className={`fixed top-0 left-0 z-40 h-screen w-72 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="h-20 flex items-center justify-center px-6 border-b border-slate-700 shrink-0">
                    <button onClick={() => onNavigate('dashboard')} className="flex items-center gap-3 text-white">
                         <Icon name="mcmLogo" className="h-8 w-8" />
                        <span className="text-xl sm:text-2xl font-bold">MCM Alerts</span>
                    </button>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-2">
                    {navItems.map(item => (
                        <NavItem key={item.name} item={item} currentPage={currentPage} onNavigate={onNavigate} />
                    ))}
                    {profile && profile.app_role === 'super_admin' && (
                        <a
                            href="#"
                            onClick={(e) => { e.preventDefault(); onNavigate('user-management'); }}
                            className={`flex items-center gap-4 rounded-md px-3 py-3 text-base font-medium transition-all ${
                                currentPage === 'user-management'
                                    ? 'bg-slate-800 text-white'
                                    : 'hover:bg-slate-700/50 hover:text-white'
                            }`}
                        >
                            <Icon name="users" className="h-6 w-6" />
                            User Management
                        </a>
                    )}
                </nav>

                <div className="px-4 py-4 mt-auto border-t border-slate-700">
                    <button 
                        onClick={onSendTestAlert}
                        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-md hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-base"
                    >
                        <Icon name="bell" className="h-5 w-5" />
                        Send Test Alert
                    </button>
                </div>
            </aside>
        </>
    );
};