
import React from 'react';

interface StuckOrdersTableProps {
  selectedCountry: string;
  selectedTime: string;
}

const StuckOrdersTable: React.FC<StuckOrdersTableProps> = ({ selectedCountry, selectedTime }) => {

  const generateStuckOrders = () => {
    const numOrders = Math.floor(Math.random() * 2) + 2; // Generate 2 or 3 stuck orders
    const orders = [];
    const now = new Date();

    const statusOptions = [
      { name: 'Pending Payment', color: 'bg-yellow-500' },
      { name: 'Awaiting Fulfillment', color: 'bg-blue-500' },
      { name: 'Shipment Overdue', color: 'bg-red-500' },
    ];

    for (let i = 0; i < numOrders; i++) {
        const hoursStuck = Math.floor(Math.random() * 8) + 1;
        const minutesStuck = Math.floor(Math.random() * 59);
        const stuckDate = new Date(now.getTime() - (hoursStuck * 60 * 60 * 1000) - (minutesStuck * 60 * 1000));
        
        orders.push({
            id: `ORD${Math.floor(Math.random() * 9000) + 1000}`,
            status: statusOptions[Math.floor(Math.random() * statusOptions.length)],
            timeStuck: `${hoursStuck}h ${minutesStuck}m`,
            date: stuckDate.toLocaleDateString(),
        });
    }
    return orders;
  };

  const stuckOrders = generateStuckOrders();

  return (
    <div className="bg-white p-4 rounded-lg shadow mt-4">
      <h2 className="text-base font-semibold text-gray-700 mb-3">Stuck Orders Investigation</h2>
      <div className="space-y-3">
        {stuckOrders.map((order) => (
          <div key={order.id} className="bg-gray-50 p-3 rounded-lg flex items-center">
            <div className="flex-grow">
              <p className="text-sm font-bold text-gray-800">{order.id}</p>
              <div className="flex items-center mt-1">
                <span className={`w-2.5 h-2.5 rounded-full ${order.status.color} mr-2`}></span>
                <p className="text-xs font-medium text-gray-600">{order.status.name}</p>
              </div>
            </div>
            <div className="text-right">
                <p className="text-sm font-semibold text-gray-800">{order.timeStuck}</p>
                <p className="text-xs text-gray-400">{order.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StuckOrdersTable;
