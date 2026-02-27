
import React from 'react';

interface Warehouse {
  id: string;
  name: string;
  isOnline: boolean;
}

// TODO: Replace with real data from your warehouse management system
const warehouses: Warehouse[] = [
  { id: 'WH-01', name: 'A', isOnline: true },
  { id: 'WH-02', name: 'B', isOnline: true },
  { id: 'WH-03', name: 'C', isOnline: true },
  { id: 'WH-04', name: 'D', isOnline: true },
  { id: 'WH-05', name: 'E', isOnline: false },
  { id: 'WH-06', name: 'F', isOnline: true },
  { id: 'WH-07', name: 'G', isOnline: true },
  { id: 'WH-08', name: 'H', isOnline: true },
  { id: 'WH-09', name: 'I', isOnline: true },
  { id: 'WH-10', name: 'J', isOnline: true },
  { id: 'WH-11', name: 'K', isOnline: true },
];

const WarehouseStatus: React.FC = () => {
  const offlineCount = warehouses.filter(wh => !wh.isOnline).length;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <h3 className="text-sm font-medium text-gray-500">Warehouse Status</h3>
      </div>
      
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {warehouses.map(wh => (
          <div key={wh.id} className="flex items-center gap-2 p-1.5 rounded-md bg-gray-50">
            <span className={`h-2.5 w-2.5 rounded-full ${wh.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-xs font-medium text-gray-700 truncate">{wh.name}</span>
          </div>
        ))}
      </div>

      <div className="text-xs text-center mt-3 text-gray-400">
        {offlineCount > 0 
          ? <span className="font-semibold text-red-500">{offlineCount} {offlineCount === 1 ? 'warehouse is' : 'warehouses are'} offline.</span>
          : <span className="text-green-500">All warehouses are online.</span>
        }
      </div>
    </div>
  );
};

export default WarehouseStatus;
