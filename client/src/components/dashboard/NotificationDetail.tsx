import React, { useState, useMemo, useEffect } from 'react';
import { type Notification, type Comment, type User } from '../../types';
import { Icon } from '../ui/Icon';
import { format, parseISO } from 'date-fns';

interface NotificationDetailProps {
  notification: Notification | null;
  onUpdateNotification: (id: string, updates: { status: 'acknowledged' | 'resolved' }) => Promise<void>;
  onAddComment: (id: string, text: string) => Promise<void>;
  onClose: () => void;
  currentUser: User | null;
  userNames?: Map<string, string>;
}

export const NotificationDetail: React.FC<NotificationDetailProps> = ({ 
  notification, 
  onUpdateNotification, 
  onAddComment, 
  onClose, 
  currentUser,
  userNames
}) => {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Reset comment text when notification changes
    setCommentText('');
  }, [notification?.id]);

  const sortedComments = useMemo(() => {
    if (!notification?.comments) return [];
    return [...notification.comments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [notification?.comments]);

  if (!notification) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center p-8 bg-background">
        <Icon name="bell" className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="font-semibold text-lg">Select a Notification</h3>
        <p className="text-muted-foreground text-sm">Choose a notification from the list to see its details.</p>
      </div>
    );
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddComment(notification.id, commentText.trim());
      setCommentText('');
    } catch (error) {
      console.error('Failed to add comment', error);
      // Optionally, show an error to the user
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (status: 'acknowledged' | 'resolved', actionText?: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await Promise.all([
        onAddComment(notification.id, actionText || `Status changed to ${status}.`),
        onUpdateNotification(notification.id, { status }),
      ]);
    } catch (error) {
      console.error(`Failed to update status to ${status}`, error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getDisplayName = (comment: Comment): string => {
    if (comment.user_full_name) return comment.user_full_name;
    if (userNames?.has(comment.user_id)) return userNames.get(comment.user_id)!;
    return 'Team Member';
  };

  const severityMap = {
    low: { bg: 'bg-blue-100', text: 'text-blue-800', darkBg: 'dark:bg-blue-900/50', darkText: 'dark:text-blue-200' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', darkBg: 'dark:bg-yellow-900/50', darkText: 'dark:text-yellow-200' },
    high: { bg: 'bg-red-100', text: 'text-red-800', darkBg: 'dark:bg-red-900/50', darkText: 'dark:text-red-200' },
  };
  const sev = severityMap[notification.severity] || severityMap.medium;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex justify-between items-start mb-2">
          <h2 className="font-semibold text-lg max-w-[calc(100%-80px)]">{notification.title}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted -mr-2">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sev.bg} ${sev.text} ${sev.darkBg} ${sev.darkText}`}>
            {notification.severity}
          </span>
          <span>&bull;</span>
          <span>{format(parseISO(notification.created_at), 'MMM d, h:mm a')}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Message Body */}
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
          <p>{notification.message}</p>
        </div>
        
        {/* Status update buttons */}
        {notification.status !== 'resolved' && (
          <div className="flex items-center gap-2">
            {notification.status === 'new' && (
              <button 
                onClick={() => handleStatusUpdate('acknowledged', 'Acknowledged the alert.')} 
                className="btn btn-secondary w-full"
                disabled={isUpdating}
              >
                {isUpdating ? <div className="spinner-xs"/> : <Icon name="check" className="w-4 h-4 mr-2"/>}
                Acknowledge
              </button>
            )}
             <button 
                onClick={() => handleStatusUpdate('resolved', 'Resolved the alert.')} 
                className="btn btn-primary w-full"
                disabled={isUpdating}
             >
                {isUpdating ? <div className="spinner-xs"/> : <Icon name="check-circle" className="w-4 h-4 mr-2"/>}
                Resolve
             </button>
          </div>
        )}

        {/* Activity / Comments */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground flex items-center">
            Activity
            {sortedComments.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-secondary-foreground bg-secondary rounded-full">
                {sortedComments.length}
              </span>
            )}
          </h3>
          <div className="space-y-4">
            {sortedComments.map(comment => {
                const isCurrentUser = comment.user_id === currentUser?.id;
                return (
                  <div key={comment.id} className={`flex gap-2 items-end ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                     <div className="w-6 h-6 rounded-full bg-muted flex-shrink-0"></div>
                     <div className="flex flex-col">
                        <div className={`flex items-baseline gap-2 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                           <span className="text-xs font-semibold text-foreground">
                              {isCurrentUser ? 'You' : getDisplayName(comment)}
                           </span>
                           <span className="text-xs text-muted-foreground">
                              {format(parseISO(comment.created_at), 'h:mm a')}
                           </span>
                        </div>
                        <div className={`rounded-2xl px-3 py-2 text-sm mt-0.5 ${isCurrentUser ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary text-secondary-foreground rounded-bl-sm'}`}>
                           <p>{comment.text}</p>
                        </div>
                     </div>
                  </div>
                )
            })}
             {sortedComments.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <p>No comments yet.</p>
                </div>
             )}
          </div>
        </div>
      </div>

      {/* Footer / Comment Input */}
      <div className="px-6 py-3 border-t border-border bg-background">
        <form onSubmit={handleAddComment} className="flex items-center gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="input flex-1"
            disabled={isSubmitting}
          />
          <button type="submit" className="btn btn-icon" disabled={!commentText.trim() || isSubmitting}>
            {isSubmitting 
              ? <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
              : <Icon name="send" className="w-4 h-4" />
            }
          </button>
        </form>
      </div>
    </div>
  );
};