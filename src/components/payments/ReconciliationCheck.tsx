
import React from 'react';

const ReconciliationCheck: React.FC = () => {
  return (
    <div className="h-full flex flex-col p-4 bg-white rounded-lg">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Reconciliation Check</h2>
      <div className="text-sm text-gray-600 mb-4">
        Expected revenue (from SFCC orders) vs settled amounts in payment_events (catches silent drops)
      </div>
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-gray-500">Expected Revenue</p>
          <p className="text-2xl font-bold text-gray-800">$1,234,567.89</p>
        </div>
        <div>
          <p className="text-gray-500">Settled Amount</p>
          <p className="text-2xl font-bold text-green-600">$1,234,567.89</p>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationCheck;
