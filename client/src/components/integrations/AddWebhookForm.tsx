import React, { useState } from 'react';
import { WebhookSource, Topic } from '../../types';
import { Button } from '../ui/Button';
import { CognitoUserSession } from 'amazon-cognito-identity-js';

interface AddWebhookFormProps {
  topics: Topic[];
  onAdd: (webhook: WebhookSource) => void;
  session: CognitoUserSession;
  onCancel: () => void;
}

export const AddWebhookForm: React.FC<AddWebhookFormProps> = ({ topics, onAdd, session, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState('adyen');
  const [topicId, setTopicId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicId) {
      setError("Please select a topic to link this webhook to.");
      return;
    }
    setError(null);
    setLoading(true);

    const newWebhook: WebhookSource = {
        id: `wh_${new Date().getTime()}`,
        name,
        description,
        source_type: sourceType,
        user_id: session.getIdToken().getJwtToken().split('.').map(s => JSON.parse(atob(s)))[1].sub,
        topic_id: topicId,
        created_at: new Date().toISOString(),
    };
    
    onAdd(newWebhook);
    setLoading(false);

  };

  return (
    <>
      <h2 className="text-xl font-semibold mb-4">Add New Webhook</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 bg-input border border-border rounded-md"
            placeholder="e.g., Adyen Live Account"
            required
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 bg-input border border-border rounded-md"
            rows={3}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sourceType" className="block text-sm font-medium mb-1">Source Type</label>
              <select
                id="sourceType"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full p-2 bg-input border border-border rounded-md"
              >
                <option value="adyen">Adyen</option>
                <option value="stripe">Stripe</option>
                <option value="github">GitHub</option>
                <option value="generic">Generic</option>
              </select>
            </div>
            <div>
              <label htmlFor="topicId" className="block text-sm font-medium mb-1">Link to Topic</label>
              <select
                id="topicId"
                value={topicId || ''}
                onChange={(e) => setTopicId(e.target.value)}
                className="w-full p-2 bg-input border border-border rounded-md"
                required
              >
                <option value="" disabled>Select a topic...</option>
                {topics.map(topic => (
                  <option key={topic.id} value={topic.id}>{topic.name}</option>
                ))}
              </select>
            </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <div className="flex justify-end gap-4 mt-6">
            <Button type="button" onClick={onCancel} variant="secondary">
                Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex items-center gap-2">
                {loading ? 'Adding...' : 'Add Webhook'}
            </Button>
        </div>
      </form>
    </>
  );
};
