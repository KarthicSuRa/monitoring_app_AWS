import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Database, Session, Notification, SystemStatusData } from '../types';
import { Icon } from '../components/ui/Icon';
import { Header } from '../components/layout/Header';

type Email = Database['public']['Tables']['emails']['Row'];

interface EmailsPageProps {
  session: Session | null;
  notifications: Notification[];
  systemStatus: SystemStatusData;
  onLogout: () => Promise<void>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  openSettings: () => void;
  onNavigate: (page: string) => void;
}

const EmailsPage: React.FC<EmailsPageProps> = ({ 
    session,
    notifications,
    systemStatus,
    onLogout,
    isSidebarOpen,
    setIsSidebarOpen,
    openSettings,
    onNavigate,
}) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [checkedEmails, setCheckedEmails] = useState<Set<string>>(new Set());

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .order('received_at', { ascending: false });

    if (error) {
      console.error('Error fetching emails:', error);
      setError(error.message);
    } else {
      setEmails(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const handleSelectEmail = async (email: Email) => {
    setSelectedEmail(email);
    if (!email.read) {
      const { error } = await supabase
        .from('emails')
        .update({ read: true })
        .eq('id', email.id);
      
      if (error) {
        console.error('Error marking email as read:', error);
      } else {
        setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read: true } : e));
      }
    }
  };

  const handleCheckboxChange = (emailId: string) => {
    setCheckedEmails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (checkedEmails.size === emails.length) {
      setCheckedEmails(new Set());
    } else {
      setCheckedEmails(new Set(emails.map(e => e.id)));
    }
  };

  const handleAction = async (action: 'delete' | 'read' | 'unread') => {
    if (checkedEmails.size === 0) return;

    const emailIds = Array.from(checkedEmails);
    let error = null;

    if (action === 'delete') {
      const { error: deleteError } = await supabase
        .from('emails')
        .delete()
        .in('id', emailIds);
      error = deleteError;
      if (!error) {
        setEmails(prev => prev.filter(e => !emailIds.includes(e.id)));
        if (selectedEmail && emailIds.includes(selectedEmail.id)) {
          setSelectedEmail(null);
        }
      }
    } else {
      const newReadStatus = action === 'read';
      const { error: updateError } = await supabase
        .from('emails')
        .update({ read: newReadStatus })
        .in('id', emailIds);
      error = updateError;
      if (!error) {
        setEmails(prev => prev.map(e => emailIds.includes(e.id) ? { ...e, read: newReadStatus } : e));
      }
    }

    if (error) {
      console.error(`Error performing action: ${action}`, error);
      alert(`Failed to ${action} emails.`);
    } else {
      setCheckedEmails(new Set());
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
          title="Inbox"
      />
      <main className="flex-1 overflow-y-auto bg-background md:ml-72">
        <div className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8 h-full flex flex-col">
            <div className="shrink-0 mb-4">
                <h1 className="text-2xl font-bold">Inbox</h1>
                <p className="text-muted-foreground">Manage your received emails.</p>
            </div>
            <div className="flex-1 flex flex-row overflow-hidden border border-border rounded-lg bg-card shadow-sm">
                {/* Left Pane: Email List */}
                <div className="flex flex-col overflow-hidden border-r border-border basis-[350px] shrink-0">
                    {/* Toolbar */}
                    <div className="p-2 border-b border-border flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                onChange={handleSelectAll}
                                checked={checkedEmails.size > 0 && checkedEmails.size === emails.length}
                                aria-label="Select all emails"
                            />
                            <button onClick={fetchEmails} className="p-2 text-muted-foreground hover:text-foreground" aria-label="Refresh emails"><Icon name="refresh-cw" className="w-5 h-5" /></button>
                            <button onClick={() => handleAction('delete')} disabled={checkedEmails.size === 0} className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-50" aria-label="Delete selected emails"><Icon name="trash-2" className="w-5 h-5" /></button>
                            <button onClick={() => handleAction('read')} disabled={checkedEmails.size === 0} className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-50" aria-label="Mark selected as read"><Icon name="check-circle" className="w-5 h-5" /></button>
                            <button onClick={() => handleAction('unread')} disabled={checkedEmails.size === 0} className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-50" aria-label="Mark selected as unread"><Icon name="mail" className="w-5 h-5" /></button>
                        </div>
                    </div>

                    {/* Email List */}
                    <div className="overflow-y-auto flex-1">
                        {loading && <div className="p-4 text-center text-muted-foreground">Loading emails...</div>}
                        {error && <div className="p-4 text-center text-red-500">Error: {error}</div>}
                        {!loading && !error && (
                            <ul className="divide-y divide-border">
                                {emails.length > 0 ? (
                                    emails.map(email => (
                                        <li 
                                            key={email.id} 
                                            onClick={() => handleSelectEmail(email)}
                                            className={`p-3 flex items-start gap-3 cursor-pointer hover:bg-accent ${selectedEmail?.id === email.id ? 'bg-accent' : ''} ${!email.read ? 'bg-blue-500/10' : ''}`}>
                                            <input 
                                                type="checkbox" 
                                                className="h-4 w-4 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={checkedEmails.has(email.id)}
                                                onClick={(e) => e.stopPropagation()} 
                                                onChange={() => handleCheckboxChange(email.id)}
                                                aria-label={`Select email from ${email.sender}`}
                                            />
                                            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${!email.read ? 'bg-blue-500' : 'bg-transparent'}`}></div>
                                            <div className="flex-1 truncate">
                                                <div className="flex justify-between items-baseline">
                                                    <p className={`font-semibold truncate ${!email.read ? 'text-foreground' : 'text-muted-foreground'}`}>{email.sender}</p>
                                                    <p className="text-xs text-muted-foreground ml-2 flex-shrink-0">{new Date(email.received_at!).toLocaleDateString()}</p>
                                                </div>
                                                <p className={`text-sm truncate ${!email.read ? 'text-foreground' : 'text-muted-foreground'}`}>{email.subject}</p>
                                                <p className="text-sm text-muted-foreground truncate">{email.message}</p>
                                            </div>
                                        </li>
                                    ))
                                ) : (
                                    <li className="p-6 text-center text-muted-foreground">Your inbox is empty.</li>
                                )}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Right Pane: Email Detail */}
                <div className="hidden md:flex flex-1 flex-col overflow-y-auto">
                    {selectedEmail ? (
                        <div className="p-6">
                            <h1 className="text-2xl font-bold mb-1">{selectedEmail.subject}</h1>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6 border-b border-border pb-4">
                                <p>From: <span className="font-medium text-foreground">{selectedEmail.sender}</span></p>
                                <p>To: <span className="font-medium text-foreground">{selectedEmail.recipient}</span></p>
                                <p className="ml-auto">{new Date(selectedEmail.received_at!).toLocaleString()}</p>
                            </div>
                            <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                                {selectedEmail.message}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <Icon name="mail" className="w-16 h-16 mx-auto mb-4" />
                                <p>Select an email to read</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </main>
  </>
  );
};

export default EmailsPage;
