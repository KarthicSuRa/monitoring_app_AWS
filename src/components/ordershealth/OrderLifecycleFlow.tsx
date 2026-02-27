import React from 'react';

interface OrderLifecycleFlowProps {
  selectedCountry: string;
  selectedTime: string;
}

const baseLifecycleData: { [key: string]: { [key: string]: number } } = {
  ALL: { sfccCreated: 249, exported: 245, somIngested: 240, fulfilled: 235, completed: 230 },
  US: { sfccCreated: 90, exported: 88, somIngested: 85, fulfilled: 82, completed: 80 },
  DE: { sfccCreated: 75, exported: 73, somIngested: 70, fulfilled: 68, completed: 65 },
  CH: { sfccCreated: 43, exported: 42, somIngested: 40, fulfilled: 38, completed: 37 },
  SG: { sfccCreated: 15, exported: 14, somIngested: 13, fulfilled: 12, completed: 11 },
  UK: { sfccCreated: 15, exported: 14, somIngested: 13, fulfilled: 12, completed: 11 },
  KR: { sfccCreated: 3, exported: 3, somIngested: 2, fulfilled: 2, completed: 2 },
  JP: { sfccCreated: 8, exported: 8, somIngested: 7, fulfilled: 7, completed: 6 },
};

const OrderLifecycleFlow: React.FC<OrderLifecycleFlowProps> = ({ selectedCountry, selectedTime }) => {

  const getLifecycleData = () => {
    const baseData = baseLifecycleData[selectedCountry] || baseLifecycleData.ALL;
    const timeValue = parseInt(selectedTime.replace(/[a-zA-Z]/g, ''));
    const timeUnit = selectedTime.replace(/[0-9]/g, '');
    
    let multiplier = 1;
    if (timeUnit === 'h') {
      multiplier = timeValue / 24;
    } else if (timeUnit === 'd') {
      multiplier = timeValue;
    }

    const scaledData = Object.keys(baseData).reduce((acc, key) => {
      acc[key] = Math.round(baseData[key] * multiplier);
      return acc;
    }, {} as { [key: string]: number });

    return scaledData;
  };

  const { sfccCreated, exported, somIngested, fulfilled, completed } = getLifecycleData();

  return (
    <div className="bg-white p-4 rounded-lg shadow col-span-2">
      <h2 className="text-lg font-semibold mb-4">Order Lifecycle Flow ({selectedTime})</h2>
      <div className="flex items-center justify-between text-center text-xs">
        <div className="w-1/5 p-2 bg-gray-200 rounded-lg">
          <p>SFCC Created</p>
          <p className="text-2xl font-bold">{sfccCreated}</p>
        </div>
        <div className="text-gray-400 text-2xl font-mono mx-2">&rarr;</div>
        <div className="w-1/5 p-2 bg-gray-200 rounded-lg">
          <p>Exported</p>
          <p className="text-2xl font-bold">{exported}</p>
        </div>
        <div className="text-gray-400 text-2xl font-mono mx-2">&rarr;</div>
        <div className="w-1/5 p-2 bg-yellow-400 text-black rounded-lg">
          <p>SOM Ingested</p>
          <p className="text-2xl font-bold">{somIngested}</p>
        </div>
        <div className="text-gray-400 text-2xl font-mono mx-2">&rarr;</div>
        <div className="w-1/5 p-2 bg-gray-200 rounded-lg">
          <p>Fulfilled</p>
          <p className="text-2xl font-bold">{fulfilled}</p>
        </div>
        <div className="text-gray-400 text-2xl font-mono mx-2">&rarr;</div>
        <div className="w-1/5 p-2 bg-gray-200 rounded-lg">
          <p>Completed</p>
          <p className="text-2xl font-bold">{completed}</p>
        </div>
      </div>
    </div>
  );
};

export default OrderLifecycleFlow;
