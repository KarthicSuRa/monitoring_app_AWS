
import React from 'react';

const OrdersReadyForExport: React.FC = () => {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Orders Ready for Export (&gt;30 min)</h2>
      <div className="text-center">
        <p className="text-5xl font-bold text-red-600">7</p>
        <p className="text-sm text-red-600">Red Bg</p>
      </div>
      {/* Bar chart placeholder */}
      <div className="w-full h-16 bg-gray-200 mt-4"></div>
    </div>
  );
};

export default OrdersReadyForExport;
