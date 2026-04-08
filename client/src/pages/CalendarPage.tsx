import React, { useRef, useState } from 'react';
import { Header } from '../components/layout/Header';
import { CalendarView, CalendarViewHandle } from '../components/calendar/CalendarView';
import { Icon } from '../components/ui/Icon';
import { Notification, SystemStatusData, User } from '../types';
import { Dropdown } from '../components/ui/Dropdown';

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Main Page Component ────────────────────────────────────────────────────

export const CalendarPage: React.FC<CalendarPageProps> = (props) => {
  const { onNavigate, user } = props;
  const calendarRef = useRef<CalendarViewHandle>(null);
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState('Month'); // Example state for view

  const handleTodayClick = () => {
    calendarRef.current?.resetToToday();
  };

  const handleSearchClick = () => {
    // This is a placeholder. In a real app, this would trigger a search UI.
    alert('Search functionality is not yet implemented.');
  };

  const handleTeamFilterChange = (team: string | null) => {
    setTeamFilter(team);
    calendarRef.current?.filterByTeam(team);
  };

  const teamOptions = [
    { label: 'All Teams', onClick: () => handleTeamFilterChange(null) },
    { label: 'CapG', onClick: () => handleTeamFilterChange('CapG') },
    { label: 'Gspann', onClick: () => handleTeamFilterChange('Gspann') },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-950 md:ml-72">
      <Header {...props} profile={user} title="Calendar" />

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="h-full flex flex-col max-w-full mx-auto">
          {/* Page Header & Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between mb-6 flex-shrink-0">
            <div className="flex items-center mb-4 sm:mb-0">
              <button onClick={() => onNavigate('dashboard')} className="p-2 rounded-full hover:bg-slate-800 mr-3">
                  <Icon name="arrow-left" className="h-5 w-5 text-slate-400" />
              </button>
              <div>
                  <h1 className="text-2xl font-bold text-white">Event Calendar</h1>
                  <p className="text-slate-400 mt-1">Schedule, view, and manage important events and releases.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <Dropdown 
                buttonText={teamFilter ? `Team: ${teamFilter}` : 'Filter by team'} 
                items={teamOptions} 
                buttonClassName="px-4 py-2 bg-slate-800/70 border border-slate-700 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              />
              <button onClick={handleSearchClick} title="Search" className="w-10 h-10 flex items-center justify-center bg-slate-800/70 border border-slate-700 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                <Icon name="search" className="h-5 w-5" />
              </button>
              <button onClick={handleTodayClick} className="px-4 h-10 bg-slate-800/70 border border-slate-700 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors">
                Today
              </button>
            </div>
          </div>

          {/* Calendar View */}
          <div className="flex-grow min-h-0 bg-slate-900/70 backdrop-blur border border-slate-800 rounded-xl overflow-hidden">
            <CalendarView ref={calendarRef} />
          </div>
        </div>
      </main>
    </div>
  );
};