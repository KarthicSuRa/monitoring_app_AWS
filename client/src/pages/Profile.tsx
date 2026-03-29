import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { apiClient } from '../lib/apiClient';
import { User } from '../types';

interface ProfilePageProps {
    profile: User | null;
    addToast: (toast: { id: string; title: string; message: string; severity: 'low' | 'medium' | 'high'; }) => void;
    onNavigate: (page: string) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ profile, addToast, onNavigate }) => {
    const [user, setUser] = useState<User | null>(profile);
    const [saving, setSaving] = useState(false);

    const handleNotificationChange = (channel: 'email' | 'push') => {
        if (!user) return;
        const currentPreferences = user.notification_preferences || {};
        setUser({ ...user, notification_preferences: { ...currentPreferences, [channel]: !currentPreferences[channel] }});
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);
        try {
            await apiClient.put(`/users/profile`, { 
                full_name: user.full_name,
                notification_preferences: user.notification_preferences
            });
            addToast({
                id: `profile-success-${Date.now()}`,
                title: 'Profile Saved',
                message: 'Your profile has been updated successfully.',
                severity: 'low',
            });
        } catch (error) {
            addToast({
                id: `profile-save-error-${Date.now()}`,
                title: 'Error Saving Profile',
                message: 'Failed to save your profile. Please try again.',
                severity: 'high',
            });
        } finally {
            setSaving(false);
        }
    };

    if (!user) {
        return <div>Loading profile...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Profile & Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your personal information, notification settings, and API access.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="p-6 bg-card rounded-xl border">
                    <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-muted-foreground mb-1">
                                Full Name
                            </label>
                            <input
                                id="fullName"
                                type="text"
                                value={user.full_name || ''}
                                onChange={(e) => setUser({ ...user, full_name: e.target.value })}
                                placeholder="Enter your full name"
                                className="mt-1 block w-full bg-input border-border rounded-md shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={user.email}
                                disabled
                                className="mt-1 block w-full bg-muted/80 border-border rounded-md shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-card rounded-xl border">
                    <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
                     <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background">
                            <div className="flex items-center">
                                <Icon name="mail" className="w-5 h-5 mr-3 text-muted-foreground"/>
                                <div>
                                    <p className="font-medium">Email Notifications</p>
                                    <p className="text-xs text-muted-foreground">Receive alerts directly to your inbox.</p>
                                </div>
                            </div>
                           <button type="button" onClick={() => handleNotificationChange('email')} className={`${(user.notification_preferences || {}).email ? 'bg-primary' : 'bg-muted'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                               <span className={`${(user.notification_preferences || {}).email ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                           </button>
                        </div>
                         <div className="flex items-center justify-between p-3 rounded-lg bg-background">
                            <div className="flex items-center">
                                <Icon name="smartphone" className="w-5 h-5 mr-3 text-muted-foreground"/>
                                 <div>
                                    <p className="font-medium">Push Notifications</p>
                                    <p className="text-xs text-muted-foreground">Get real-time alerts on your devices.</p>
                                </div>
                            </div>
                           <button type="button" onClick={() => handleNotificationChange('push')} className={`${(user.notification_preferences || {}).push ? 'bg-primary' : 'bg-muted'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}>
                               <span className={`${(user.notification_preferences || {}).push ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                           </button>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-card rounded-xl border">
                    <h2 className="text-xl font-semibold mb-4">Team Settings</h2>
                     <div className="flex items-center justify-between p-3 rounded-lg bg-background">
                        <div>
                            <p className="font-medium">Team Name</p>
                            <p className="text-sm text-muted-foreground">{user.team?.name || 'Not part of a team'}</p>
                        </div>
                        <Button variant="outline" onClick={() => onNavigate('/user-management')}>Manage Team</Button>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button type="submit" disabled={saving}>
                        {saving ? <><Icon name="loader-2" className="w-4 h-4 mr-2 animate-spin"/> Saving...</> : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default ProfilePage;
