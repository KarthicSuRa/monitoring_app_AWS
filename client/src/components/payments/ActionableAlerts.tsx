
import React from 'react';

interface Alert {
  id: number;
  severity: 'High' | 'Medium' | 'Low';
  type: 'Decline Rate' | 'Webhook Delay' | 'Fraud Spike';
  description: string;
  recommendation: string;
}

const alerts: Alert[] = [
  {
    id: 1,
    severity: 'High',
    type: 'Decline Rate',
    description: "High volume of 'Insufficient Funds' declines for VISA in Germany.",
    recommendation: 'Review recent changes to payment gateways or contact Adyen support.'
  },
  {
    id: 2,
    severity: 'Medium',
    type: 'Webhook Delay',
    description: "Adyen webhook for 'AUTHORISATION' is delayed by more than 5 minutes.",
    recommendation: 'Check the status of your webhook processing service.'
  },
  {
    id: 3,
    severity: 'Low',
    type: 'Fraud Spike',
    description: 'Spike in Fraud decline codes from a specific BIN range.',
    recommendation: 'Consider adding a new rule to your fraud engine to block this BIN range.'
  }
];

const getSeverityColor = (severity: 'High' | 'Medium' | 'Low') => {
  switch (severity) {
    case 'High': return 'bg-red-500';
    case 'Medium': return 'bg-yellow-500';
    case 'Low': return 'bg-blue-500';
  }
};

const ActionableAlerts: React.FC = () => {
  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div key={alert.id} className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center">
            <div className={`w-2.5 h-2.5 rounded-full ${getSeverityColor(alert.severity)} mr-3`}></div>
            <div className="flex-grow">
                <p className="text-sm font-bold text-gray-800">{alert.type}</p>
                <p className="text-xs font-medium text-gray-600">{alert.description}</p>
            </div>
          </div>
          <div className="mt-2 pl-5">
            <p className="text-xs text-gray-500 font-semibold">
              Recommendation: <span className="font-normal">{alert.recommendation}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActionableAlerts;
