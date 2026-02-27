import React from 'react';
import type { Event } from '../../data/TrackingData'; // Corrected Path

const icons = {
  email: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  api: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>,
  info: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

const EmptyState = () => (
  <div className="details-empty-state">
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <p>Select an event from the timeline to see details.</p>
  </div>
);

interface DetailsInspectorProps {
  event: Event | null;
}

const DetailsInspector: React.FC<DetailsInspectorProps> = ({ event }) => {
  if (!event) {
    return <div className="details-container"><EmptyState /></div>;
  }

  const { title, subtitle, data, logs } = event.details;

  return (
    <div className="details-container">
      <h2>{title}</h2>
      <p style={{ marginTop: '-1rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>{subtitle}</p>

      {Object.keys(data).length > 0 && (
        <div className="details-section">
          <h4>Details</h4>
          {Object.entries(data).map(([key, value]) => (
            <div className="detail-item" key={key}>
              <span>{key}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <div className="details-section">
          <h4>Activity Log</h4>
          {logs.map((log, index) => (
            <div className="detail-item log-item" key={index}>
              {icons[log.type]}
              <span style={{ flex: 1 }}>{log.message}</span>
              <span>{log.timestamp}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DetailsInspector;
