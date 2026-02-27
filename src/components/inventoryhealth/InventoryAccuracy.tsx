
import React from 'react';

interface InventoryAccuracyProps {
  // Props if needed
}

const InventoryAccuracy: React.FC<InventoryAccuracyProps> = () => {
  // TODO: Replace with real data from OCI vs SFCC product export
  const accuracyPercentage = 100; // Example value

  const isCritical = accuracyPercentage < 98;
  const color = isCritical ? '#f59e0b' : '#22c55e'; // amber-500 or green-500

  const radius = 32;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (accuracyPercentage / 100) * circumference;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col justify-between">
      <div className="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
        <h3 className="text-sm font-medium text-gray-500">Inventory Accuracy</h3>
      </div>
      
      <div className="relative w-24 h-24 my-2 mx-auto">
          <svg className="w-full h-full" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
              <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
              />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold" style={{ color }}>{accuracyPercentage.toFixed(1)}%</span>
          </div>
      </div>

      <div className="text-center text-xs text-gray-400">
        <p>Physical (OCI) vs. Displayed (SFCC)</p>
        <p className="mt-1">Critical when: <strong>&lt; 98%</strong></p>
      </div>
    </div>
  );
};

export default InventoryAccuracy;
