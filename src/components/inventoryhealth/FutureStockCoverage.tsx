
import React from 'react';

interface FutureStockCoverageProps {
  // Props if needed
}

const FutureStockCoverage: React.FC<FutureStockCoverageProps> = () => {
  // TODO: Replace with real data from OCI futureStock array
  const missingFutureStockCount = 3; // Example value

  const isCritical = missingFutureStockCount > 0;
  const color = isCritical ? '#f97316' : '#22c55e'; // orange-500

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-500">Future Stock Coverage</h3>
        </div>
        <p className="text-xs text-gray-400 mt-1 pl-7">Upcoming SKUs with zero future stock, risking pre-orders.</p>
      </div>

      <div className="text-center my-4">
        <span className="text-4xl font-bold" style={{ color }}>
          {missingFutureStockCount}
        </span>
        <span className="text-lg font-semibold ml-1" style={{ color }}>SKUs</span>
      </div>

      <div className="text-xs text-gray-400 text-center">
        <span>Critical for <strong>any pre-order SKU</strong></span>
      </div>
    </div>
  );
};

export default FutureStockCoverage;
