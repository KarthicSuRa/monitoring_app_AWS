
import React from 'react';

const zeroStockSkus = [
  'MXBFSCJ04BK080',
  'MXBFSCJ04BK090',
];

const SkusWithZeroStock: React.FC = () => {
  const count = zeroStockSkus.length;
  const isCritical = count > 0;

  return (
    <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm flex flex-col">
      <div className="p-3 border-b border-gray-200/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Zero Stock SKUs</h3>
            <p className="text-xs text-gray-500">Physically unavailable.</p>
          </div>
        </div>
      </div>
      
      <div className="p-3">
        {isCritical ? (
          <ul className="text-sm text-gray-700 space-y-1">
            {zeroStockSkus.map(sku => <li key={sku}>{sku}</li>)}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-4xl font-bold text-green-500">0</span>
            <span className="text-xs font-medium text-gray-500 mt-1">SKUs Affected</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkusWithZeroStock;
