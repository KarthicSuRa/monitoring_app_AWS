import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import { Button } from '../components/ui/Button';
import { apiClient } from '../lib/apiClient';
import { User } from '../types';

interface ProfilePageProps {
    profile: User | null;
    addToast: (toast: { id: string; title: string; message: string; severity: 'low' | 'medium' | 'high'; }) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ profile, addToast }) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (profile) {
            setLoading(true);
            apiClient.get('/users/profile')
                .then(response => {
                    setFullName(response.data.full_name || '');
                    setEmail(response.data.email || '');
                })
                .catch(error => {
                    addToast({
                        id: `profile-error-${Date.now()}`,
                        title: 'Error Loading Profile',
                        message: 'Could not load your profile. Please try again later.',
                        severity: 'high',
                    });
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [profile, addToast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await apiClient.post('/users/profile', { full_name: fullName });
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

    if (loading) {
        return <div>Loading profile...</div>;
    }

    return (
        <div className="max-w-2xl mx-auto p-4">
            <Card title="Your Profile">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            disabled
                            className="mt-1 bg-gray-100 dark:bg-gray-800 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Full Name
                        </label>
                        <input
                            id="fullName"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Enter your full name"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                    </div>
                    <Button type="submit" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </form>
            </Card>
        </div>
    );
};

export default ProfilePage;
