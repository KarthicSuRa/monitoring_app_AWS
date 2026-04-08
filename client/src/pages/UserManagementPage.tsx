import React, { useState, useEffect, useMemo } from 'react';
import * as api from '../lib/api';
import { User, SystemStatusData, Notification, Team, Topic } from '../types';
import { Header } from '../components/layout/Header';

// ─── Types ──────────────────────────────────────────────────────────────────
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

// ─── UI Helper Components ───────────────────────────────────────────────────

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
  'from-blue-500 to-cyan-400',
  'from-violet-500 to-fuchsia-400',
  'from-emerald-500 to-lime-400',
  'from-amber-500 to-yellow-400',
  'from-rose-500 to-red-400',
];

const avatarColor = (id: string) => AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length];

const Avatar: React.FC<{ user: { id: string; full_name?: string | null; email?: string | null }, size?: 'sm' | 'md' }> = ({ user, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
  };
  return (
    <div className={`rounded-full bg-gradient-to-br ${avatarColor(user.id)} flex-shrink-0 flex items-center justify-center font-bold text-white ${sizeClasses[size]}`}>
      {getInitials(user.full_name || '', user.email || '')}
    </div>
  );
};

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const styles: Record<string, string> = {
    super_admin: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    admin: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    member: 'bg-slate-700/50 text-slate-400 border-slate-600/50',
  };
  const roleName: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    member: 'Member',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[role] || styles.member}`}>
      {roleName[role] || 'Member'}
    </span>
  );
};

const Card: React.FC<{ children: React.ReactNode, className?: string, padding?: boolean }> = ({ children, className = '', padding = true }) => (
  <div className={`bg-slate-900/70 backdrop-blur border border-slate-800 rounded-xl ${className}`}>
    {padding ? <div className="p-5">{children}</div> : children}
  </div>
);

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, wide }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className={`relative z-10 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] flex flex-col`}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white">{title}</h2>
                <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                    &times;
                </button>
            </div>
            <div className="overflow-y-auto p-6">{children}</div>
        </div>
    </div>
);


// ─── Page Section Components ────────────────────────────────────────────────

const UserListItem: React.FC<{ user: User; onEdit: () => void }> = ({ user, onEdit }) => (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-slate-800/50 transition-colors">
        <Avatar user={user} />
        <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.full_name || 'Unnamed User'}</p>
            <p className="text-sm text-slate-400 truncate">{user.email}</p>
        </div>
        <div className="hidden md:block">
            <RoleBadge role={user.app_role || 'member'} />
        </div>
        <button onClick={onEdit} className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-semibold text-slate-300 transition-all">
            Edit
        </button>
    </div>
);

const TeamListItem: React.FC<{ team: TeamWithMembers; onManage: () => void }> = ({ team, onManage }) => (
    <div className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-slate-800/50 transition-colors">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.084-1.282-.237-1.887M7 12H3v-2a3 3 0 016 0v2M7 12h10" /></svg>
            </div>
            <div>
                <p className="text-sm font-semibold text-white">{team.name}</p>
                <p className="text-sm text-slate-400">{team.members.length} member{team.members.length !== 1 ? 's' : ''}</p>
            </div>
        </div>
        <button onClick={onManage} className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-semibold text-slate-300 transition-all">
            Manage
        </button>
    </div>
);

// ─── Modal Content Components ─────────────────────────────────────────────

const EditUserContent: React.FC<{
    user: User;
    editedFields: { full_name: string; app_role: string };
    setEditedFields: React.Dispatch<React.SetStateAction<{ full_name: string; app_role: string }>>;
    onSave: () => void;
    onCancel: () => void;
}> = ({ user, editedFields, setEditedFields, onSave, onCancel }) => (
    <div className="space-y-6">
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
            <input
                type="text"
                value={editedFields.full_name}
                onChange={e => setEditedFields({ ...editedFields, full_name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-lg px-4 py-2.5 text-white outline-none"
                placeholder="Enter full name"
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
            <select
                value={editedFields.app_role}
                onChange={e => setEditedFields({ ...editedFields, app_role: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-lg px-4 py-2.5 text-white outline-none appearance-none"
            >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
            </select>
        </div>
        <div className="flex gap-4 mt-6 pt-6 border-t border-slate-800">
            <button onClick={onSave} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-lg transition-all">
                Save Changes
            </button>
            <button onClick={onCancel} className="px-4 py-2.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 rounded-lg transition-all">
                Cancel
            </button>
        </div>
    </div>
);


const ManageTeamContent: React.FC<{
    team: TeamWithMembers;
    allUsers: User[];
    topics: Topic[];
    onAddMember: (userId: string) => void;
    onRemoveMember: (userId: string) => void;
    onUpdateTopicTeam: (topicId: string, teamId: string | null) => Promise<void>;
}> = ({ team, allUsers, topics, onAddMember, onRemoveMember, onUpdateTopicTeam }) => {
    const [userToAdd, setUserToAdd] = useState('');
    const memberIds = useMemo(() => new Set(team.members.map(m => m.id)), [team.members]);
    const usersNotInTeam = useMemo(() => allUsers.filter(u => !memberIds.has(u.id)), [allUsers, memberIds]);

    return (
        <div className="grid md:grid-cols-2 gap-8">
            {/* Members Column */}
            <div className="space-y-6">
                <div>
                    <h3 className="text-base font-semibold text-white mb-3">Add Member</h3>
                    <div className="flex gap-2">
                        <select value={userToAdd} onChange={e => setUserToAdd(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none">
                            <option value="">Select a user...</option>
                            {usersNotInTeam.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                        </select>
                        <button onClick={() => { onAddMember(userToAdd); setUserToAdd(''); }} disabled={!userToAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed">
                            Add
                        </button>
                    </div>
                </div>

                <div>
                    <h3 className="text-base font-semibold text-white mb-3">Members ({team.members.length})</h3>
                    <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg max-h-72 overflow-y-auto divide-y divide-slate-700/50">
                        {team.members.length === 0 ? (
                            <p className="text-slate-400 text-center py-8 text-sm">No members in this team yet.</p>
                        ) : team.members.map(member => (
                            <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                                <Avatar user={member} size="sm" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{member.full_name}</p>
                                    <p className="text-xs text-slate-400 truncate">{member.email}</p>
                                </div>
                                <button onClick={() => onRemoveMember(member.id)} className="text-sm text-red-400 hover:text-red-300 font-semibold">
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Topic Assignments Column */}
            <div className="space-y-6">
                 <h3 className="text-base font-semibold text-white mb-3">Topic Assignments</h3>
                 <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg max-h-[25rem] overflow-y-auto divide-y divide-slate-700/50">
                     {topics.length === 0 ? (
                         <p className="text-slate-400 text-center py-8 text-sm">No topics available.</p>
                     ) : topics.map(topic => {
                         const isAssigned = topic.team_id === team.id;
                         return (
                            <div key={topic.id} className="flex items-center justify-between gap-4 px-4 py-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{topic.name}</p>
                                    <p className="text-xs text-slate-400 truncate">{topic.description || 'No description'}</p>
                                </div>
                                <label className="cursor-pointer">
                                    <input type="checkbox" checked={isAssigned} onChange={() => onUpdateTopicTeam(topic.id, isAssigned ? null : team.id)} className="sr-only" />
                                    <div className={`w-11 h-6 rounded-full transition-colors ${isAssigned ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                        <span className={`block w-4 h-4 m-1 bg-white rounded-full shadow transform transition-transform ${isAssigned ? 'translate-x-5' : ''}`} />
                                    </div>
                                </label>
                            </div>
                         );
                    })}
                 </div>
            </div>
        </div>
    );
};


// ─── Main Page Component ────────────────────────────────────────────────────

const UserManagementPage: React.FC<UserManagementPageProps> = (props) => {
  const { user, topics, onLogout, isSidebarOpen, setIsSidebarOpen, notifications, openSettings, systemStatus, onNavigate, onUpdateTopicTeam } = props;

  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState('');
  const [managingTeam, setManagingTeam] = useState<TeamWithMembers | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editedFields, setEditedFields] = useState({ full_name: '', app_role: 'member' });
  const [activeTab, setActiveTab] = useState<'users' | 'teams'>('users');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersData, teamsData] = await Promise.all([api.getUsers(), api.getTeams()]);
      setUsers(usersData || []);
      setTeams((teamsData as TeamWithMembers[]) || []);
    } catch (err) { console.error('Error fetching data:', err); }
    setLoading(false);
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  useEffect(() => {
    if (managingTeam?.id) {
      setManagingTeam(prev => teams.find(t => t.id === prev?.id) || null);
    }
  }, [teams, managingTeam?.id]);

  const createTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      const newTeam = await api.createTeam(newTeamName);
      setTeams(prev => [...prev, newTeam as TeamWithMembers]);
      setNewTeamName('');
    } catch (err) { alert(`Error creating team: ${err}`); }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const updated = await api.updateUser(editingUser.id, editedFields);
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      setEditingUser(null);
    } catch (err) { alert(`Error updating user: ${err}`); }
  };

  const addMemberToTeam = async (userId: string) => {
    if (!userId || !managingTeam) return;
    try {
      await api.addTeamMember(managingTeam.id, userId, 'member');
      fetchData(); // Refetch to get updated team memberships
    } catch (err) { alert(`Error adding member: ${err}`); }
  };

  const removeMemberFromTeam = async (userId: string) => {
    if (!managingTeam) return;
    try {
      await api.removeTeamMember(managingTeam.id, userId);
      fetchData(); // Refetch to get updated team memberships
    } catch (err) { alert(`Error removing member: ${err}`); }
  };

  const openEditModal = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setEditedFields({ full_name: userToEdit.full_name || '', app_role: userToEdit.app_role || 'member' });
  };

  const filteredUsers = useMemo(() =>
    users.filter(u =>
      !searchQuery ||
      (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    ), [users, searchQuery]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 md:ml-72">
      <Header {...props} profile={user} title="User & Team Management" />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
        {loading ? (
            <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            <div>
                <p className="text-slate-400">Manage users, roles, and team assignments for your organisation.</p>
            </div>
            
            <div className="flex gap-1 bg-slate-800/80 border border-slate-700/50 rounded-xl p-1 w-fit">
              {(['users', 'teams'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}`}>
                  {tab === 'users' ? `Users (${users.length})` : `Teams (${teams.length})`}
                </button>
              ))}
            </div>

            {activeTab === 'users' && (
              <Card padding={false}>
                <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-slate-800">
                  <h2 className="text-base font-semibold text-white">All Users</h2>
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name or email..." className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white w-full max-w-xs" />
                </div>
                <div className="divide-y divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <p className="text-slate-400 text-center py-10">No users found.</p>
                  ) : filteredUsers.map(u => <UserListItem key={u.id} user={u} onEdit={() => openEditModal(u)} />)}
                </div>
                <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500">
                  {filteredUsers.length} of {users.length} users
                </div>
              </Card>
            )}

            {activeTab === 'teams' && (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-8">
                    <Card>
                        <h3 className="text-base font-semibold text-white mb-4">Create New Team</h3>
                        <div className="flex gap-3">
                            <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createTeam()} placeholder="New team name..." className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white" />
                            <button onClick={createTeam} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg">Create</button>
                        </div>
                    </Card>
                     <Card padding={false}>
                        <div className="px-4 py-3 border-b border-slate-800"><h3 className="text-base font-semibold text-white">All Teams ({teams.length})</h3></div>
                        <div className="divide-y divide-slate-800">
                            {teams.length === 0 ? (
                                <p className="text-slate-400 text-center py-10">No teams created yet.</p>
                            ) : teams.map(team => <TeamListItem key={team.id} team={team} onManage={() => setManagingTeam(team)} />)}
                        </div>
                    </Card>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {editingUser && (
        <Modal title={`Edit User: ${editingUser.full_name || editingUser.email}`} onClose={() => setEditingUser(null)}>
          <EditUserContent user={editingUser} editedFields={editedFields} setEditedFields={setEditedFields} onSave={handleUpdateUser} onCancel={() => setEditingUser(null)} />
        </Modal>
      )}

      {managingTeam && (
        <Modal title={`Manage Team: ${managingTeam.name}`} onClose={() => setManagingTeam(null)} wide>
          <ManageTeamContent team={managingTeam} allUsers={users} topics={topics} onAddMember={addMemberToTeam} onRemoveMember={removeMemberFromTeam} onUpdateTopicTeam={onUpdateTopicTeam} />
        </Modal>
      )}
    </div>
  );
};

export default UserManagementPage;
