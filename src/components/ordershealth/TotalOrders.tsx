import React from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface TotalOrdersProps {
  selectedCountry: string;
  selectedTime: string;
}

const countryOrders: { [key: string]: number } = {
  US: 90,
  DE: 75,
  CH: 43,
  SG: 15,
  UK: 15,
  KR: 3,
  JP: 8,
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-white rounded-lg shadow-lg border border-gray-200">
        <p className="label text-sm text-gray-700">{`Time: ${label}`}</p>
        <p className="intro text-sm text-gray-900 font-bold">{`Orders: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

const TotalOrders: React.FC<TotalOrdersProps> = ({ selectedCountry, selectedTime }) => {
  const getTotalOrders = () => {
    if (selectedCountry === 'ALL') {
      return Object.values(countryOrders).reduce((sum, orders) => sum + orders, 0);
    }
    return countryOrders[selectedCountry] || 0;
  };

  const totalOrders = getTotalOrders();

  const generateChartData = () => {
    const data = [];
    const now = new Date();
    let hours, intervals;
    switch (selectedTime) {
      case '1h': hours = 1; intervals = 4; break;
      case '4h': hours = 4; intervals = 8; break;
      case '8h': hours = 8; intervals = 8; break;
      case '24h': hours = 24; intervals = 12; break;
      case '48h': hours = 48; intervals = 12; break;
      default: hours = 24; intervals = 12;
    }

    const averageOrders = totalOrders / hours;

    for (let i = hours; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 60 * 60 * 1000);
      const fluctuation = (Math.random() - 0.5) * averageOrders * 0.8;
      const orders = Math.max(0, Math.round(averageOrders + fluctuation));
      data.push({
        time: `${date.getHours()}:00`,
        orders: orders,
      });
    }
    return data;
  };

  const chartData = generateChartData();

  return (
    <div className="bg-white p-6 rounded-lg shadow h-full flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-gray-500 text-sm font-medium">Total Orders ({selectedTime})</h2>
          <p className="text-4xl font-bold text-gray-800 mt-1">{totalOrders}</p>
        </div>
        <div className="text-right flex items-center bg-green-100 text-green-800 rounded-full px-3 py-1 text-sm font-semibold">
          <span>+5.9%</span>
        </div>
      </div>
      <div className="flex-grow" style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 10, right: 5, left: 5, bottom: 0 }}>
            <defs>
              <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.7}/>
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip content={<CustomTooltip />} />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} interval={Math.floor(chartData.length / 6)} padding={{ left: 10, right: 10 }} />
            <Area type="monotone" dataKey="orders" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorOrders)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TotalOrders;
