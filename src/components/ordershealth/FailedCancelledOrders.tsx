
import React from 'react';

interface FailedCancelledOrdersProps {
  selectedCountry: string;
  selectedTime: string;
}

const countryFailedOrders: { [key: string]: number } = {
  ALL: 32,
  US: 9,
  DE: 6,
  CH: 2,
  SG: 4,
  UK: 3,
  KR: 5,
  JP: 3,
};

const baseFailureRootCauses = [
  { cause: 'Payment', percentage: 45, color: '#ef4444' },
  { cause: 'Inventory', percentage: 25, color: '#f97316' },
  { cause: 'Address', percentage: 20, color: '#3b82f6' },
  { cause: 'Fraud', percentage: 10, color: '#8b5cf6' },
];

const FailedCancelledOrders: React.FC<FailedCancelledOrdersProps> = ({ selectedCountry, selectedTime }) => {
  const getFailedOrders = () => {
    const baseCount = countryFailedOrders[selectedCountry] || 32;
    return Math.round(baseCount + (Math.random() - 0.5) * 5);
  };

  const failedOrders = getFailedOrders();

  const failureCausesWithCounts = baseFailureRootCauses.map(item => ({
      ...item,
      count: Math.round(failedOrders * (item.percentage / 100))
  }));

  const totalCalculated = failureCausesWithCounts.reduce((sum, item) => sum + item.count, 0);
  const diff = failedOrders - totalCalculated;
  if (diff !== 0) {
      let maxIndex = 0;
      failureCausesWithCounts.forEach((item, index) => {
          if (item.count > failureCausesWithCounts[maxIndex].count) {
              maxIndex = index;
          }
      });
      failureCausesWithCounts[maxIndex].count += diff;
  }

  return (
    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500">Failed & Cancelled Orders</h3>
        <span className="text-xl font-bold text-red-500">{failedOrders}</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 flex overflow-hidden mb-2">
        {baseFailureRootCauses.map(item => (
            <div
                key={item.cause}
                className="h-2"
                style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
            ></div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {failureCausesWithCounts.map(item => (
            <div key={item.cause} className="flex items-center text-xs">
                <span className="w-1.5 h-1.5 mr-2 rounded-full" style={{backgroundColor: item.color}}></span>
                <span className="text-gray-500">{item.cause}</span>
                <span className="ml-auto font-semibold text-gray-700">{item.count}</span>
            </div>
        ))}
      </div>
    </div>
  );
};

export default FailedCancelledOrders;
