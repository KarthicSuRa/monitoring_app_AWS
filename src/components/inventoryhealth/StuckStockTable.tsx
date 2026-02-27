
import React from 'react';

const stuckStockData = [
  { sku: 'MOHYSUIT01BK', location: 'Warehouse A', days: 120, qty: 50 },
  { sku: 'MOHYSUIT01RD', location: 'Warehouse B', days: 95, qty: 30 },
  { sku: 'MOHYSUIT01BL', location: 'Warehouse A', days: 80, qty: 75 },
  { sku: 'MOHYSUIT02BK', location: 'Warehouse C', days: 150, qty: 20 },
  { sku: 'MOHYSUIT02WH', location: 'Warehouse A', days: 110, qty: 45 },
  { sku: 'MOHYSUIT03GR', location: 'Warehouse B', days: 85, qty: 60 },
  { sku: 'MOHYSUIT03NY', location: 'Warehouse C', days: 130, qty: 25 },
];

const StuckStockTable: React.FC = () => {
  return (
    <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm h-full flex flex-col">
      <div className="p-3 border-b border-gray-200/80 flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.698 12.969l-7.99 7.99a1 1 0 01-1.414 0l-7.99-7.99a1 1 0 010-1.414l7.99-7.99a1 1 0 011.414 0l7.99 7.99a1 1 0 010 1.414z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 12.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Stuck Stock</h3>
          <p className="text-xs text-gray-500">Inventory with no sales in over 60 days.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50/70 border-b border-gray-200/80">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">SKU</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Location</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">Aging (Days)</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">QTY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/60">
                {stuckStockData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 transition-colors duration-150">
                    <td className="p-2.5 font-mono text-gray-800 whitespace-nowrap">{item.sku}</td>
                    <td className="p-2.5 text-gray-600 whitespace-nowrap">{item.location}</td>
                    <td className="p-2.5 text-center text-gray-600 whitespace-nowrap">{item.days}</td>
                    <td className="p-2.5 text-center text-gray-600 whitespace-nowrap">{item.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default StuckStockTable;
