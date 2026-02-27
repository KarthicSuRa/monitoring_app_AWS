
import React from 'react';

interface InventoryLatencyProps {
  // Props if needed
}

const InventoryLatency: React.FC<InventoryLatencyProps> = () => {
  // TODO: Replace with real data from response time metric
  const latency = 2.3; // Example value in seconds

  const isCritical = latency > 2;
  const color = isCritical ? '#ef4444' : '#22c55e';

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col justify-between">
        <div>
            <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm font-medium text-gray-500">Inventory Latency</h3>
            </div>
            <p className="text-xs text-gray-400 mt-1 pl-7">OCI API response time. Slow responses lead to stale stock display.</p>
        </div>

        <div className="text-center my-4">
            <span className="text-4xl font-bold" style={{ color }}>
            {latency.toFixed(1)}
            </span>
            <span className="text-lg font-semibold ml-1" style={{ color }}>s</span>
        </div>

        <div className="text-xs text-gray-400 text-center">
            <span>Critical when: <strong>&gt; 2 seconds</strong></span>
        </div>
    </div>
  );
};

export default InventoryLatency;
