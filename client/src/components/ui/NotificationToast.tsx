import React, { useEffect } from 'react';
import { Icon } from './Icon';
import { Notification, Severity } from '../../types';
interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  /** Auto-dismiss duration in ms. Default: 6000. Pass 0 to disable. */
  autoDismissMs?: number;
}
// FIXED: Old version had no dark mode, no auto-dismiss, no ARIA roles
const severityStyles: Record<Severity, {
  bg: string;
  border: string;
  icon: string;
  iconColor: string;
  title: string;
  progressBar: string;
}> = {
  low: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-700',
    icon: 'info',
    iconColor: 'text-blue-500',
    title: 'text-blue-900 dark:text-blue-100',
    progressBar: 'bg-blue-400',
  },
  medium: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/30',
    border: 'border-yellow-200 dark:border-yellow-700',
    icon: 'alert-triangle',
    iconColor: 'text-yellow-500',
    title: 'text-yellow-900 dark:text-yellow-100',
    progressBar: 'bg-yellow-400',
  },
  high: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-700',
    icon: 'alert-circle',
    iconColor: 'text-red-500',
    title: 'text-red-900 dark:text-red-100',
    progressBar: 'bg-red-400',
  },
};
export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose,
  autoDismissMs = 6000,
}) => {
  const styles = severityStyles[notification.severity] ?? severityStyles.medium;
  // HOW IT WORKS: Sets a timer to auto-close the toast after autoDismissMs.
  // The cleanup function clears the timer if the component unmounts first
  // (e.g. user manually closes before timer fires) — prevents memory leaks
  // and calling onClose() on an unmounted component.
  useEffect(() => {
    if (!autoDismissMs) return;
    const timer = setTimeout(onClose, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, onClose]);
  return (
    <div
      role="alert"                     // ✅ Screen readers announce this immediately
      aria-live="assertive"            // ✅ Interrupts current reading for critical alerts
      className={`
        max-w-sm w-full shadow-lg rounded-lg pointer-events-auto
        border ${styles.bg} ${styles.border}
        ring-1 ring-black ring-opacity-5 overflow-hidden
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Severity icon — colour matches severity level */}
          <div className="flex-shrink-0 mt-0.5">
            <Icon name={styles.icon} className={`h-5 w-5 ${styles.iconColor}`} />
          </div>
          {/* Notification content */}
          <div className="flex-1 min-w-0">
            <p className={`text-xs sm:text-sm font-semibold ${styles.title}`}>
              {notification.title}
            </p>
            <p className="mt-0.5 text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
              {notification.message}
            </p>
          </div>
          {/* Manual close button */}
          <div className="flex-shrink-0">
            <button
              onClick={onClose}
              aria-label="Close notification"
              className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* HOW IT WORKS: CSS animation shrinks the bar from 100% → 0% over autoDismissMs.
            Gives user a visual countdown so they know the toast will disappear.
            Matches the actual setTimeout duration exactly. */}
        {autoDismissMs > 0 && (
          <div className="mt-3 h-0.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
            <div
              className={`h-full ${styles.progressBar} rounded-full`}
              style={{
                animation: `shrink ${autoDismissMs}ms linear forwards`,
              }}
            />
          </div>
        )}
      </div>
      {/* Inline keyframe: shrinks the progress bar width from 100% to 0 */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
};