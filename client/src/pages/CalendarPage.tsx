import React, { useRef } from 'react';
import { Header } from '../components/layout/Header';
import { CalendarView, CalendarViewHandle } from '../components/calendar/CalendarView';
import { Icon } from '../components/ui/Icon';
import { Notification, SystemStatusData, User } from '../types';

interface CalendarPageProps {
  onNavigate: (page: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onLogout: () => Promise<void>;
  openSettings: () => void;
  systemStatus: SystemStatusData;
  notifications: Notification[];
  user: User | null;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({ 
    onNavigate, 
    isSidebarOpen, 
    setIsSidebarOpen, 
    onLogout, 
    openSettings, 
    systemStatus, 
    notifications, 
    user 
}) => {
  const calendarRef = useRef<CalendarViewHandle>(null);

  const handleTodayClick = () => {
    calendarRef.current?.resetToToday();
  };

  const handleSearchClick = () => {
    // In a real app, this would open a search modal or input
    alert('Search functionality is not yet implemented.');
  };

  const handleViewChangeClick = () => {
    // In a real app, this might toggle between month/week/day views
    alert('View change functionality is not yet implemented.');
  };

  const monthOptions = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' },
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
          profile={user} 
          title="Calendar" 
      />
      <main className="flex-1 overflow-y-auto bg-background md:ml-72">
        <div className="h-full flex flex-col p-4 md:p-6 lg:p-8 text-foreground">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div className="flex items-center">
              <button onClick={() => onNavigate('dashboard')} className="p-2 rounded-full hover:bg-muted mr-4">
                  <Icon name="arrow-left" className="h-5 w-5 text-foreground" />
              </button>
              <h1 className="text-3xl font-bold">Event Calendar</h1>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <button onClick={handleSearchClick} className="p-2 rounded-md hover:bg-muted">
                <Icon name="search" className="h-5 w-5" />
              </button>
              <button onClick={handleViewChangeClick} className="p-2 rounded-md hover:bg-muted">
                <Icon name="grid" className="h-5 w-5" />
              </button>
              <button onClick={handleTodayClick} className="p-2 rounded-md hover:bg-muted border border-transparent hover:border-border">
                Today
              </button>
            </div>
          </div>

          <div className="flex-grow min-h-0">
            <CalendarView ref={calendarRef} />
          </div>
        </div>
      </main>
    </>
  );
};
