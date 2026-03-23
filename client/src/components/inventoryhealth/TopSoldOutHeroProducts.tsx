
import React from 'react';

const soldOutHeroes = [
  'MEFCSTQ01EG001',
  'MESESAH02CO035',
  'MESESAH02CO036',
  'MESESAH02CO039',
  'MESESAH02CO040',
  'MESESAJ03CO035',
];

const TopSoldOutHeroProducts: React.FC = () => {
  return (
    <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm h-full flex flex-col">
      <div className="p-3 border-b border-gray-200/80 flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.52 4.674c.3.921-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.118l1.52-4.674a1 1 0 00-.363-1.118L2.05 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
          </div>
          <div>
              <h3 className="text-sm font-semibold text-gray-700">Top Sold-Out Heroes</h3>
              <p className="text-xs text-gray-500">High-demand, unavailable products.</p>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto">
          {soldOutHeroes.length > 0 ? (
              <div className="divide-y divide-gray-200/60">
                  {soldOutHeroes.map(sku => (
                      <div key={sku} className="px-3 py-2.5 flex justify-between items-center hover:bg-gray-50/50 transition-colors duration-150">
                          <span className="font-mono text-xs text-gray-800 font-medium">{sku}</span>
                          <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">SOLD OUT</span>
                      </div>
                  ))}
              </div>
          ) : (
              <div className="flex-1 flex items-center justify-center text-center p-4">
                  <p className="text-sm text-gray-500 italic">No hero products are currently sold out.</p>
              </div>
          )}
      </div>
    </div>
  );
};

export default TopSoldOutHeroProducts;
