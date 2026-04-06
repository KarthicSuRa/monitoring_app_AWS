import React, { useState, useEffect, useMemo } from 'react';
import * as api from '../lib/api';
import { User, SystemStatusData, Notification, Team, Topic } from '../types';
import { Header } from '../components/layout/Header';

// ─── Types ────────────────────────────────────────────────────────────────

interface TeamWithMembers extends Team {
  members: User[];
}

interface UserManagementPageProps {
  user: User | null;
  topics: Topic[];
  onLogout: () => Promise<void>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  notifications: Notification[];
  openSettings: () => void;
  systemStatus: SystemStatusData;
  onNavigate: (page: string) => void;
  onUpdateTopicTeam: (topicId: string, teamId: string | null) => Promise<void>;
}

// ─── Avatar initials helper ───────────────────────────────────────────────

const getInitials = (name: string, email: string) => {
  if (name) {
    const parts = name.trim().split(' ');
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
};

const AVATAR_COLORS = [
  'from-blue-500 to-blue-600',
  'from-violet-500 to-violet-600',
  'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
];

const avatarColor = (id: string) =>
  AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];

// ─── Role Badge ───────────────────────────────────────────────────────────

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const styles: Record<string, string> = {
    super_admin: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    admin:       'bg-blue-500/15 text-blue-300 border-blue-500/30',
    member:      'bg-slate-700/50 text-slate-400 border-slate-600/50',
  };
  const cls = styles[role] || styles.member;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {role === 'super_admin' ? 'Super Admin' : role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
};

// ─── Modal wrapper ────────────────────────────────────────────────────────

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({
  title, onClose, children, wide,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <div className={`relative z-10 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-md'} max-h-[90vh] flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all text-lg leading-none"
        >
          ×
        </button>
      </div>
      <div className="overflow-y-auto px-6 py-5">
        {children}
      </div>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────

const UserManagementPage: React.FC<UserManagementPageProps> = ({
  user, topics, onLogout, isSidebarOpen, setIsSidebarOpen,
  notifications, openSettings, systemStatus, onNavigate, onUpdateTopicTeam,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState('');
  const [managingTeam, setManagingTeam] = useState<TeamWithMembers | null>(null);
  const [userToAdd, setUserToAdd] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editedFields, setEditedFields] = useState<{ full_name: string; app_role: string }>({ full_name: '', app_role: 'member' });
  const [activeTab, setActiveTab] = useState<'users' | 'teams'>('users');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersData, teamsData] = await Promise.all([api.getUsers(), api.getTeams()]);
      setUsers(usersData || []);
      setTeams((teamsData as TeamWithMembers[]) || []);
    } catch (err) { console.error('Error fetching data:', err); }
    setLoading(false);
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      const t = await api.createTeam(newTeamName);
      setTeams(prev => [...prev, t as TeamWithMembers]);
      setNewTeamName('');
    } catch (err) { alert(`Error creating team: ${err}`); }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const updated = await api.updateUser(editingUser.id, { full_name: editedFields.full_name, app_role: editedFields.app_role });
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      setEditingUser(null);
    } catch (err) { alert(`Error updating user: ${err}`); }
  };

  const addMemberToTeam = async () => {
    if (!userToAdd || !managingTeam) return;
    try {
      await api.addTeamMember(managingTeam.id, userToAdd, 'member');
      await fetchData();
      setUserToAdd('');
    } catch (err) { alert(`Error adding member: ${err}`); }
  };

  useEffect(() => {
    if (managingTeam?.id) {
      const fresh = teams.find(t => t.id === managingTeam.id);
      setManagingTeam(fresh || null);
    }
  }, [teams, managingTeam?.id]);

  const removeMemberFromTeam = async (userId: string) => {
    if (!managingTeam) return;
    try {
      await api.removeTeamMember(managingTeam.id, userId);
      await fetchData();
    } catch (err) { alert(`Error removing member: ${err}`); }
  };

  const usersNotInTeam = useMemo(() => {
    if (!managingTeam) return users;
    const ids = new Set(managingTeam.members.map(m => m.id));
    return users.filter(u => !ids.has(u.id));
  }, [users, managingTeam]);

  const topicsForTeam = useMemo(() => {
    if (!managingTeam) return [];
    return topics.map(t => ({ ...t, isAssigned: t.team_id === managingTeam.id }));
  }, [topics, managingTeam]);

  const filteredUsers = useMemo(() =>
    users.filter(u =>
      !searchQuery ||
      (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    ), [users, searchQuery]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 md:ml-72">
      <Header
        onNavigate={onNavigate}
        onLogout={onLogout}
        notifications={notifications}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        openSettings={openSettings}
        systemStatus={systemStatus}
        profile={user || null}
        title="User & Team Management"
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Loading…</p>
            </div>
          </div>
        ) : (
          <>
            {/* Section intro */}
            <div className="mb-6">
              <p className="text-slate-400 text-sm">Manage users, roles, and team assignments for your organisation.</p>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1 w-fit mb-6">
              {(['users', 'teams'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'users' ? `👤 Users (${users.length})` : `👥 Teams (${teams.length})`}
                </button>
              ))}
            </div>

            {/* ── Users Tab ─────────────────────────────────────────────── */}
            {activeTab === 'users' && (
              <div className="bg-slate-900/60 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-700/50">
                  <h2 className="text-sm font-semibold text-white">All Users</h2>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email…"
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-56"
                  />
                </div>

                {/* User list */}
                <div className="divide-y divide-slate-700/30">
                  {filteredUsers.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-10">No users found</p>
                  ) : filteredUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(u.id)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {getInitials(u.full_name || '', u.email || '')}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{u.full_name || 'Unnamed User'}</p>
                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      </div>
                      {/* Role */}
                      <RoleBadge role={u.app_role || 'member'} />
                      {/* Edit */}
                      <button
                        onClick={() => { setEditingUser(u); setEditedFields({ full_name: u.full_name || '', app_role: u.app_role || 'member' }); }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs text-slate-300 transition-all"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-700/50 text-xs text-slate-600">
                  {filteredUsers.length} of {users.length} users
                </div>
              </div>
            )}

            {/* ── Teams Tab ─────────────────────────────────────────────── */}
            {activeTab === 'teams' && (
              <div className="space-y-4">
                {/* Create team */}
                <div className="bg-slate-900/60 backdrop-blur border border-slate-700/50 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Create New Team</h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newTeamName}
                      onChange={e => setNewTeamName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && createTeam()}
                      placeholder="Team name…"
                      className="flex-1 bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
                    />
                    <button
                      onClick={createTeam}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm transition-all"
                    >
                      Create
                    </button>
                  </div>
                </div>

                {/* Teams list */}
                <div className="bg-slate-900/60 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-700/50">
                    <h3 className="text-sm font-semibold text-white">All Teams ({teams.length})</h3>
                  </div>
                  <div className="divide-y divide-slate-700/30">
                    {teams.length === 0 ? (
                      <p className="text-slate-500 text-sm text-center py-10">No teams yet. Create one above.</p>
                    ) : teams.map(team => (
                      <div key={team.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 text-base">
                            👥
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{team.name}</p>
                            <p className="text-xs text-slate-500">{team.members.length} member{team.members.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setManagingTeam(team)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs text-slate-300 transition-all"
                        >
                          Manage →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Edit User Modal ──────────────────────────────────────────────── */}
      {editingUser && (
        <Modal title={`Edit User — ${editingUser.email}`} onClose={() => setEditingUser(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text"
                value={editedFields.full_name}
                onChange={e => setEditedFields({ ...editedFields, full_name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-all"
                placeholder="Enter full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Application Role</label>
              <select
                value={editedFields.app_role}
                onChange={e => setEditedFields({ ...editedFields, app_role: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-all"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6 pt-5 border-t border-slate-700/50">
            <button
              onClick={handleUpdateUser}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-all"
            >
              Save Changes
            </button>
            <button
              onClick={() => setEditingUser(null)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-sm transition-all"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* ── Manage Team Modal ────────────────────────────────────────────── */}
      {managingTeam && (
        <Modal title={`Manage Team — ${managingTeam.name}`} onClose={() => setManagingTeam(null)} wide>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Members column */}
            <div className="space-y-4">
              {/* Add member */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Add Member</label>
                <div className="flex gap-2">
                  <select
                    value={userToAdd}
                    onChange={e => setUserToAdd(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-white outline-none transition-all"
                  >
                    <option value="">Select a user…</option>
                    {usersNotInTeam.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={addMemberToTeam}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Member list */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Members ({managingTeam.members.length})
                </p>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  {managingTeam.members.length === 0 ? (
                    <p className="text-slate-500 text-xs text-center py-6">No members yet</p>
                  ) : managingTeam.members.map(m => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/30 last:border-0">
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColor(m.id)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                        {getInitials(m.full_name || '', m.email || '')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{m.full_name || 'Unnamed'}</p>
                        <p className="text-[10px] text-slate-500 truncate">{m.email}</p>
                      </div>
                      <button
                        onClick={() => removeMemberFromTeam(m.id)}
                        className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Topic assignments column */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Topic Assignments
              </p>
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                {topicsForTeam.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-6">No topics to assign</p>
                ) : topicsForTeam.map(topic => (
                  <label key={topic.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-700/30 last:border-0 cursor-pointer hover:bg-slate-700/30 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">{topic.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{topic.description || 'No description'}</p>
                    </div>
                    <div className="relative flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={topic.isAssigned}
                        onChange={() => onUpdateTopicTeam(topic.id, topic.isAssigned ? null : managingTeam.id)}
                        className="sr-only"
                      />
                      <div className={`w-10 h-6 rounded-full border transition-all ${topic.isAssigned ? 'bg-blue-600 border-blue-500' : 'bg-slate-700 border-slate-600'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-all mt-0.5 ${topic.isAssigned ? 'ml-5' : 'ml-0.5'}`} />
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default UserManagementPage;
