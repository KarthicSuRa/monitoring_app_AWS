
import React, { useState } from 'react';

interface StuckOrder {
  id: string;
  status: { name: string; color: string };
  timeStuck: string;
  date: string;
  reason: string;
  acknowledged: boolean;
  assignee?: string;
}

interface StuckOrdersTableProps {
  selectedCountry: string;
  selectedTime: string;
}

const StuckOrdersTable: React.FC<StuckOrdersTableProps> = ({ selectedCountry, selectedTime }) => {
  const generateInitialStuckOrders = (): StuckOrder[] => {
    const numOrders = Math.floor(Math.random() * 2) + 2; // Generate 2 or 3 stuck orders
    const orders: StuckOrder[] = [];
    const now = new Date();

    const statusOptions = [
      { name: 'Pending Payment', color: 'bg-yellow-500' },
      { name: 'Awaiting Fulfillment', color: 'bg-blue-500' },
      { name: 'Shipment Overdue', color: 'bg-red-500' },
    ];

    const reasonOptions = [
      'SFCC API unresponsive',
      'Invalid product SKU',
      'Inventory check failed',
      'Address validation error',
    ];

    for (let i = 0; i < numOrders; i++) {
      const hoursStuck = Math.floor(Math.random() * 8) + 1;
      const minutesStuck = Math.floor(Math.random() * 59);
      const stuckDate = new Date(now.getTime() - hoursStuck * 60 * 60 * 1000 - minutesStuck * 60 * 1000);

      orders.push({
        id: `ORD${Math.floor(Math.random() * 9000) + 1000}`,
        status: statusOptions[Math.floor(Math.random() * statusOptions.length)],
        timeStuck: `${hoursStuck}h ${minutesStuck}m`,
        date: stuckDate.toLocaleDateString(),
        reason: reasonOptions[Math.floor(Math.random() * reasonOptions.length)],
        acknowledged: Math.random() > 0.5,
        assignee: Math.random() > 0.5 ? 'John Doe' : undefined,
      });
    }
    return orders;
  };

  const [stuckOrders, setStuckOrders] = useState<StuckOrder[]>(generateInitialStuckOrders());

  const handleAcknowledge = (orderId: string) => {
    setStuckOrders(
      stuckOrders.map((order) =>
        order.id === orderId ? { ...order, acknowledged: true, assignee: 'Jane Doe' } : order
      )
    );
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mt-4">
      <h2 className="text-base font-semibold text-gray-700 mb-3">Stuck Orders Investigation</h2>
      <div className="space-y-3">
        {stuckOrders.map((order) => (
          <div key={order.id} className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center">
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
            <div className="mt-2">
              <p className="text-xs text-red-600 font-semibold">
                Reason: <span className="font-normal">{order.reason}</span>
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
                {order.acknowledged ? (
                    <div className="text-green-600">
                        Acknowledged {order.assignee && `by ${order.assignee}`}
                    </div>
                ) : (
                    <button 
                        onClick={() => handleAcknowledge(order.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded"
                    >
                        Acknowledge
                    </button>
                )}
              <div className="flex items-center space-x-2">
                <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-2 rounded">
                  Assign
                </button>
                <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-2 rounded">
                  Comment
                </button>
                <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded">
                  Resolve
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StuckOrdersTable;
