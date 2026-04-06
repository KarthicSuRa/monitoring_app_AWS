import React, { useState, useEffect, useMemo } from 'react';
import * as api from '../lib/api';
import { User, SystemStatusData, Notification, Team, Topic } from '../types';
import { Header } from '../components/layout/Header';

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

const UserManagementPage: React.FC<UserManagementPageProps> = ({
    user,
    topics,
    onLogout,
    isSidebarOpen,
    setIsSidebarOpen,
    notifications,
    openSettings,
    systemStatus,
    onNavigate,
    onUpdateTopicTeam,
}) => {
    const [users, setUsers] = useState<User[]>([]);
    const [teams, setTeams] = useState<TeamWithMembers[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTeamName, setNewTeamName] = useState('');
    const [managingTeam, setManagingTeam] = useState<TeamWithMembers | null>(null);
    const [userToAdd, setUserToAdd] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editedFields, setEditedFields] = useState<{ full_name: string; app_role: string }>({ full_name: '', app_role: 'member' });
    const [activeTab, setActiveTab] = useState('users');

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersData, teamsData] = await Promise.all([
                api.getUsers(),
                api.getTeams(),
            ]);
            setUsers(usersData || []);
            setTeams((teamsData as TeamWithMembers[]) || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            // Optionally, show an error message to the user
        }
        setLoading(false);
    };

    const createTeam = async () => {
        if (!newTeamName.trim()) return;
        try {
            const newTeam = await api.createTeam(newTeamName);
            setTeams(prevTeams => [...prevTeams, newTeam as TeamWithMembers]);
            setNewTeamName('');
        } catch (error) {
            alert(`Error creating team: ${error}`);
        }
    };
    
    const handleUpdateUser = async () => {
        if (!editingUser) return;
        try {
            const updatedUser = await api.updateUser(editingUser.id, {
                full_name: editedFields.full_name,
                app_role: editedFields.app_role,
            });
            setUsers(users.map(u => (u.id === updatedUser.id ? updatedUser : u)));
            setEditingUser(null);
        } catch (error) {
            alert(`Error updating user: ${error}`);
        }
    };

    const addMemberToTeam = async () => {
        if (!userToAdd || !managingTeam) return;
        try {
            await api.addTeamMember(managingTeam.id, userToAdd, 'member');
            // Instead of instantly updating the UI, we'll refetch the data for consistency
            await fetchData();
            setUserToAdd('');
        } catch (error) {
            alert(`Error adding member: ${error}`);
        }
    };
    
    useEffect(() => {
        if (managingTeam?.id) {
            const freshTeamData = teams.find(t => t.id === managingTeam.id);
            setManagingTeam(freshTeamData || null);
        }
    }, [teams, managingTeam?.id]);

    const removeMemberFromTeam = async (userId: string) => {
        if (!managingTeam) return;
        try {
            await api.removeTeamMember(managingTeam.id, userId);
            // Refetch for consistency
            await fetchData();
        } catch (error) {
            alert(`Error removing member: ${error}`);
        }
    };
    
    const usersNotInTeam = useMemo(() => {
        if (!managingTeam) return users;
        const memberIds = new Set(managingTeam.members.map(m => m.id));
        return users.filter(u => !memberIds.has(u.id));
    }, [users, managingTeam]);

    const topicsForTeam = useMemo(() => {
        if (!managingTeam) return [];
        return topics.map(topic => ({
            ...topic,
            isAssigned: topic.team_id === managingTeam.id,
        }));
    }, [topics, managingTeam]);

    const userProfile: User | null = useMemo(() => {
        try {
            if (!user) return null;
            return user;
        } catch (error) {
            console.error('Failed to parse user profile from session:', error);
            return null;
        }
    }, [user]);

    return (
        <div className="flex flex-col h-screen bg-base-200 md:ml-72">
            <Header
                onNavigate={onNavigate}
                onLogout={onLogout}
                notifications={notifications}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                openSettings={openSettings}
                systemStatus={systemStatus}
                profile={userProfile}
                title="User & Team Management"
            />
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <span className="loading loading-spinner loading-lg"></span>
                    </div>
                ) : (
                    <>
                        <div className="tabs tabs-boxed mb-6 bg-base-100">
                            <a className={`tab ${activeTab === 'users' ? 'tab-active' : ''}`} onClick={() => setActiveTab('users')}>Users</a> 
                            <a className={`tab ${activeTab === 'teams' ? 'tab-active' : ''}`} onClick={() => setActiveTab('teams')}>Teams</a> 
                        </div>

                        {activeTab === 'users' && (
                            <div className="card bg-base-100 shadow-xl">
                                <div className="card-body">
                                    <h2 className="card-title">All Users</h2>
                                    <div className="overflow-x-auto">
                                        <table className="table w-full">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Email</th>
                                                    <th>App Role</th>
                                                    <th></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map(user => (
                                                    <tr key={user.id}>
                                                        <td>{user.full_name || 'N/A'}</td>
                                                        <td>{user.email}</td>
                                                        <td><span className="badge badge-ghost">{user.app_role}</span></td>
                                                        <td>
                                                            <button
                                                                className="btn btn-sm btn-outline btn-primary"
                                                                onClick={() => {
                                                                    setEditingUser(user);
                                                                    setEditedFields({ full_name: user.full_name || '', app_role: user.app_role || 'member' });
                                                                }}
                                                            >
                                                                Edit
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'teams' && (
                             <div className="card bg-base-100 shadow-xl">
                                <div className="card-body">
                                    <h2 className="card-title">All Teams</h2>
                                     <div className="flex gap-2 my-4">
                                        <input
                                            type="text"
                                            value={newTeamName}
                                            onChange={(e) => setNewTeamName(e.target.value)}
                                            placeholder="New team name..."
                                            className="input input-bordered w-full"
                                        />
                                        <button onClick={createTeam} className="btn btn-primary">Create Team</button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="table w-full">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Members</th>
                                                    <th></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {teams.map(team => (
                                                    <tr key={team.id}>
                                                        <td>{team.name}</td>
                                                        <td>{team.members.length}</td>
                                                        <td>
                                                            <button onClick={() => setManagingTeam(team)} className="btn btn-sm btn-outline btn-secondary">
                                                                Manage
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {editingUser && (
                 <div className="modal modal-open">
                    <div className="modal-box w-11/12 max-w-lg">
                         <button onClick={() => setEditingUser(null)} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                        <h3 className="font-bold text-lg">Edit User: {editingUser.email}</h3>
                        <div className="py-4 space-y-4">
                            <div className="form-control">
                                <label className="label"><span className="label-text">Full Name</span></label>
                                <input
                                    type="text"
                                    value={editedFields.full_name}
                                    onChange={(e) => setEditedFields({ ...editedFields, full_name: e.target.value })}
                                    className="input input-bordered w-full"
                                    placeholder="Enter full name"
                                />
                            </div>
                           <div className="form-control">
                                <label className="label"><span className="label-text">App Role</span></label>
                                <select
                                    value={editedFields.app_role}
                                    onChange={(e) => setEditedFields({ ...editedFields, app_role: e.target.value })}
                                    className="select select-bordered w-full"
                                >
                                    <option value="member">member</option>
                                    <option value="super_admin">super_admin</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-action">
                            <button onClick={handleUpdateUser} className="btn btn-primary">Save Changes</button>
                            <button onClick={() => setEditingUser(null)} className="btn">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {managingTeam && (
                <div className="modal modal-open">
                    <div className="modal-box w-11/12 max-w-4xl">
                        <button onClick={() => setManagingTeam(null)} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                        <h3 className="font-bold text-lg">Manage Team: {managingTeam.name}</h3>
                        
                        <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Add Member</span></label>
                                    <div className="join">
                                        <select value={userToAdd} onChange={(e) => setUserToAdd(e.target.value)} className="select select-bordered join-item w-full">
                                            <option value="">Select a user...</option>
                                            {usersNotInTeam.map(user => <option key={user.id} value={user.id}>{user.full_name || user.email}</option>)}
                                        </select>
                                        <button onClick={addMemberToTeam} className="btn btn-primary join-item">Add</button>
                                    </div>
                                </div>

                                <div className="form-control">
                                    <label className="label"><span className="label-text">Current Members ({managingTeam.members.length})</span></label>
                                    <div className="overflow-x-auto h-60 border rounded-box">
                                    <table className="table table-zebra w-full">
                                        <tbody>
                                        {managingTeam.members.map(member => (
                                            <tr key={member.id}>
                                                <td>
                                                    <div className="font-bold">{member.full_name}</div>
                                                    <div className="text-sm opacity-50">{member.email}</div>
                                                </td>
                                                <td><button onClick={() => removeMemberFromTeam(member.id)} className="btn btn-xs btn-error">Remove</button></td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                     {managingTeam.members.length === 0 && <p className="p-4 text-center text-base-content/60">No members in this team yet.</p>}
                                    </div>
                                </div>
                            </div>

                             <div className="form-control">
                                <label className="label"><span className="label-text">Topic Assignments</span></label>
                                <div className="overflow-y-auto h-96 border rounded-box">
                                    {topicsForTeam.map(topic => (
                                        <div key={topic.id} className="p-4 flex justify-between items-center border-b">
                                            <div>
                                                <p className="font-medium">{topic.name}</p>
                                                <p className="text-sm text-base-content/60">{topic.description || 'No description'}</p>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                checked={topic.isAssigned}
                                                onChange={() => onUpdateTopicTeam(topic.id, topic.isAssigned ? null : managingTeam.id)}
                                                className="toggle toggle-primary"
                                            />
                                        </div>
                                    ))}
                                    {topicsForTeam.length === 0 && <p className="p-4 text-center text-base-content/60">No topics available to assign.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagementPage;
