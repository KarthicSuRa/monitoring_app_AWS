
import React from 'react';

const skusBelowAts = [
  'MYBFSUM02I9090',
  'MYBFSUM02I9100',
  'MYBFSUM02I9110',
];

const SkusBelowAts: React.FC = () => {
  const count = skusBelowAts.length;
  const isCritical = count > 0;

  return (
    <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm flex flex-col">
      <div className="p-3 border-b border-gray-200/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700">SKUs Below ATS</h3>
            <p className="text-xs text-gray-500">Insufficient stock.</p>
          </div>
        </div>
      </div>
      
      <div className="p-3">
        {isCritical ? (
          <ul className="text-sm text-gray-700 space-y-1">
            {skusBelowAts.map(sku => <li key={sku}>{sku}</li>)}
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

export default SkusBelowAts;
