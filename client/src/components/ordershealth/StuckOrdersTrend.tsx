
import React from 'react';

interface StuckOrdersTrendProps {
  // Props if any, e.g., for data fetching
}

const StuckOrdersTrend: React.FC<StuckOrdersTrendProps> = () => {
  // Mock data for the trend chart
  const trendData = [
    { day: '2023-10-01', stuckOrders: 5 },
    { day: '2023-10-02', stuckOrders: 8 },
    { day: '2023-10-03', stuckOrders: 3 },
    { day: '2023-10-04', stuckOrders: 6 },
    { day: '2023-10-05', stuckOrders: 4 },
    { day: '2023-10-06', stuckOrders: 7 },
    { day: '2023-10-07', stuckOrders: 9 },
  ];

  const maxValue = Math.max(...trendData.map(d => d.stuckOrders), 0) + 2;

  return (
    <div className="bg-white p-4 rounded-lg shadow mt-4">
      <h2 className="text-base font-semibold text-gray-700 mb-3">Stuck Orders Trend (Last 7 Days)</h2>
      <div className="h-40 flex items-end justify-around pt-4">
        {trendData.map((data, index) => (
          <div key={index} className="flex flex-col items-center">
            <div 
              className="w-8 bg-blue-500 rounded-t-lg" 
              style={{ height: `${(data.stuckOrders / maxValue) * 100}%` }}
            ></div>
            <span className="text-xs mt-1">{new Date(data.day).getDate()}</span>
          </div>
        ))}
      </div>
       <div className="text-center text-xs text-gray-500 mt-2">October</div>
    </div>
  );
};

export default StuckOrdersTrend;
