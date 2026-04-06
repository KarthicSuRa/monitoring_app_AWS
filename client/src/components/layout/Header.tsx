import * as React from 'react';
import { Icon } from '../ui/Icon';
import { ThemeContext } from '../../contexts/ThemeContext';
import { Notification, SystemStatusData, User } from '../../types';
import { SystemStatusPopover } from './SystemStatusPopover';

interface HeaderProps {
  onLogout: () => Promise<void>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  openSettings: () => void;
  notifications: Notification[];
  systemStatus: SystemStatusData;
  onNavigate: (page: string) => void;
  title?: string;
  profile: User | null;
  onSearch?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onLogout,
  isSidebarOpen,
  setIsSidebarOpen,
  openSettings,
  systemStatus,
  title,
  onNavigate,
  profile,
}) => {
  const themeContext = React.useContext(ThemeContext);
  const [isProfileOpen, setProfileOpen] = React.useState(false);
  const [isStatusOpen, setStatusOpen] = React.useState(false);
  const profileRef = React.useRef<HTMLDivElement>(null);
  const statusRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!themeContext) return null;

  const statusMap: Record<string, { dot: string; label: string }> = {
    operational:          { dot: 'bg-emerald-500', label: 'Operational' },
    degraded_performance: { dot: 'bg-amber-500',   label: 'Degraded' },
    major_outage:         { dot: 'bg-red-500',      label: 'Outage' },
    unknown:              { dot: 'bg-slate-500',    label: 'Unknown' },
  };

  const statusInfo = statusMap[systemStatus?.status || 'unknown'] ?? statusMap.unknown;

  const initials = profile?.email
    ? profile.email[0].toUpperCase()
    : profile?.full_name
    ? profile.full_name[0].toUpperCase()
    : 'U';

  return (
    /*
     * Single-line sticky header.
     * md:ml-72 offsets for the fixed sidebar.
     * We deliberately avoid flex-wrap so it never breaks to two lines.
     * The title is centred between the left hamburger and right actions.
     */
    <header className="sticky top-0 z-30 flex items-center h-14 px-4 md:px-6 border-b border-border bg-card/95 backdrop-blur-sm shrink-0 md:ml-72">

      {/* ── LEFT: mobile hamburger ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          className="md:hidden p-1.5 -ml-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label="Toggle sidebar"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>

        {/* Page title — single truncated line */}
        <h1 className="text-base font-semibold text-foreground truncate leading-none">
          {title || 'MCM Alerts'}
        </h1>
      </div>

      {/* ── RIGHT: compact action buttons ─────────────────────────────── */}
      <div className="flex items-center gap-0.5 flex-shrink-0">

        {/* System Status */}
        <div className="relative" ref={statusRef}>
          <button
            onClick={() => setStatusOpen(prev => !prev)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all text-xs font-medium"
            aria-label="System Status"
          >
            <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
            <span className="hidden sm:inline">{statusInfo.label}</span>
          </button>
          {isStatusOpen && <SystemStatusPopover status={systemStatus} />}
        </div>

        {/* Divider */}
        <span className="w-px h-5 bg-border mx-1 hidden sm:block" />

        {/* Theme toggle */}
        <button
          onClick={themeContext.toggleTheme}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          <Icon name={themeContext.theme === 'dark' ? 'sun' : 'moon'} className="w-4 h-4" />
        </button>

        {/* Emails */}
        <button
          onClick={() => onNavigate('emails')}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          aria-label="Emails"
          title="Emails"
        >
          <Icon name="mail" className="w-4 h-4" />
        </button>

        {/* Settings */}
        <button
          onClick={openSettings}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          aria-label="Settings"
          title="Settings"
        >
          <Icon name="settings" className="w-4 h-4" />
        </button>

        {/* Divider */}
        <span className="w-px h-5 bg-border mx-1" />

        {/* Profile */}
        {profile && (
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(prev => !prev)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-accent transition-all focus:outline-none"
              aria-label="Profile menu"
            >
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                {initials}
              </div>
              {/* Show truncated name only on lg+ */}
              <span className="hidden lg:block text-sm font-medium text-foreground max-w-[120px] truncate leading-none">
                {profile.full_name || profile.email}
              </span>
              <Icon name="chevron-down" className="w-3.5 h-3.5 text-muted-foreground hidden lg:block flex-shrink-0" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-card border border-border rounded-lg shadow-xl py-1.5 z-50">
                <div className="px-3 py-2.5 border-b border-border">
                  <p className="text-sm font-semibold text-foreground truncate">{profile.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{profile.email}</p>
                </div>
                <button
                  onClick={() => { onNavigate('profile'); setProfileOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2.5 transition-colors"
                >
                  <Icon name="user" className="w-4 h-4 text-muted-foreground" />
                  Profile
                </button>
                <button
                  onClick={onLogout}
                  className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                >
                  <Icon name="log-out" className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
