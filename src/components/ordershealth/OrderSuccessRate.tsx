import React from 'react';

interface OrderSuccessRateProps {
  selectedCountry: string;
  selectedTime: string;
}

const countrySuccessRates: { [key: string]: number } = {
  ALL: 89.5,
  US: 92.3,
  DE: 88.1,
  CH: 95.2,
  SG: 85.4,
  UK: 87.6,
  KR: 80.1,
  JP: 91.8,
};

const countryTotalOrders: { [key: string]: number } = {
  ALL: 249,
  US: 90,
  DE: 75,
  CH: 43,
  SG: 15,
  UK: 15,
  KR: 3,
  JP: 8,
};

const OrderSuccessRate: React.FC<OrderSuccessRateProps> = ({ selectedCountry, selectedTime }) => {
  const baseRate = countrySuccessRates[selectedCountry] || 89.5;
  const fluctuation = (Math.random() - 0.5) * 1.8;
  const successRate = Math.max(85, Math.min(99.9, baseRate + fluctuation));

  const isHealthy = successRate >= 96;
  const isWarning = successRate >= 92;
  const color = isHealthy ? '#16a34a' : isWarning ? '#f59e0b' : '#dc2626';

  const timeMultiplier = parseInt(selectedTime.replace(/\D/g, '')) / (selectedTime.includes('d') ? 1 : 24);
  const totalOrders = Math.round((countryTotalOrders[selectedCountry] || 2490) * timeMultiplier);
  const successfulOrders = Math.round(totalOrders * (successRate / 100));
  const failedOrders = totalOrders - successfulOrders;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-full flex flex-col justify-between">
      {/* Title */}
      <div className="text-center">
        <h3 className="text-sm font-medium text-gray-500">Order Success Rate</h3>
        <p className="text-xs text-gray-400 mt-1">
          {selectedCountry === 'ALL' ? 'Global' : selectedCountry} • {selectedTime}
        </p>
      </div>

      {/* Main Success Rate */}
      <div className="flex items-center justify-center gap-4 my-2">
          <div className="flex items-baseline">
            <span className="text-4xl font-bold" style={{ color }}>
              {successRate.toFixed(1)}%
            </span>
            <span className={`text-xl font-medium ${isHealthy ? 'text-green-600' : isWarning ? 'text-amber-600' : 'text-red-600'}`}>
              {isHealthy ? '↑' : '→'}
            </span>
          </div>
      </div>
      
      {/* Sub-metrics */}
      <div className="text-center text-xs text-gray-500">
        <p>{successfulOrders.toLocaleString()} successful • {failedOrders.toLocaleString()} failed</p>
      </div>
    </div>
  );
};

export default OrderSuccessRate;
