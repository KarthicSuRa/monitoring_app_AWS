import React from 'react';

const alerts = [
  { type: 'Critical', message: 'Adyen authorization rate for DE has dropped to 75% in the last 15 mins.', color: 'red' },
  { type: 'Warning', message: "High increase in 'Insufficient Funds' declines for Chase cards in the US.", color: 'yellow' },
  { type: 'Info', message: 'Apple Pay volume in the UK has increased by 50% in the last 24 hours.', color: 'blue' },
  { type: 'Warning', message: 'Upcoming SSL certificate expiration for PayPal integration in 7 days.', color: 'yellow' },
];

const AlertingPanel: React.FC = () => {
  return (
    <div className="h-full flex flex-col p-4 bg-white rounded-lg">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Current Active Alerts</h2>
      <div className="space-y-3">
        {alerts.map(alert => (
          <div key={alert.message} className={`bg-${alert.color}-50 border border-${alert.color}-200 rounded-lg p-3`}>
            <p className={`font-bold text-${alert.color}-700 mb-1`}>{alert.type}</p>
            <p className={`text-sm text-${alert.color}-600`}>
              {alert.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertingPanel;
