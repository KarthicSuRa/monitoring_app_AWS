
import React from 'react';
import { BarChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell, ComposedChart } from 'recharts';

interface OrderComparisonProps {
  selectedCountry: string;
  selectedTime: string;
}

// Using consistent daily order numbers from other components
const countryTotalOrders: { [key: string]: number } = {
  ALL: 249,
  US: 90,
  DE: 75,
  CH: 43,
  SG: 15,
  UK: 15,
  KR: 3,
  JP: 8,
};

const OrderComparison: React.FC<OrderComparisonProps> = ({ selectedCountry, selectedTime }) => {
  const getOrderData = () => {
    const base = countryTotalOrders[selectedCountry] || countryTotalOrders.ALL;
    
    const isAnomaly = Math.random() < 0.2;
    const anomalyMultiplier = 1 + (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.2);

    const todayOrders = Math.round(
      base * (isAnomaly ? anomalyMultiplier : 1 + (Math.random() - 0.5) * 0.1)
    );

    const data = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        orders: Math.round(base * (1 + (Math.random() - 0.5) * 0.3)),
      };
    });

    data.push({
      name: 'Today',
      orders: todayOrders,
    });
    
    const sevenDayTotal = data.reduce((sum, day) => sum + day.orders, 0);
    const sevenDayAvg = Math.round(sevenDayTotal / 7);

    const chartData = data.map(d => ({ ...d, average: sevenDayAvg }));
    const anomalyPercentage = ((todayOrders - sevenDayAvg) / sevenDayAvg) * 100;

    return { todayOrders, sevenDayAvg, anomalyPercentage, chartData };
  };

  const { todayOrders, sevenDayAvg, anomalyPercentage, chartData } = getOrderData();

  const isPositive = anomalyPercentage >= 0;
  const isSignificantAnomaly = Math.abs(anomalyPercentage) > 25;
  const anomalyColor = isSignificantAnomaly ? (isPositive ? 'text-green-500' : 'text-red-500') : 'text-gray-500';

  const getBarColor = (orders: number, average: number, isToday: boolean) => {
    const deviation = orders - average;
    if (deviation > 0) {
        return isToday ? '#22c55e' : '#a7f3d0'; // green-500 / green-200
    } else if (deviation < 0) {
        return isToday ? '#ef4444' : '#fee2e2'; // red-500 / red-100
    } else {
        return '#e5e7eb'; // gray-200
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-sm p-2 border border-gray-200 rounded-md shadow-lg">
          <p className="text-sm font-semibold text-gray-800">{label}</p>
          <p className="text-xs text-blue-600 font-medium">{`Orders: ${payload[0].value.toLocaleString()}`}</p>
          <p className="text-xs text-amber-600 font-medium">{`7-Day Avg: ${payload[1].value.toLocaleString()}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md h-full flex flex-col">
      <h3 className="text-sm font-medium text-gray-500">Order Volume Anomaly</h3>
      <div className="flex items-baseline space-x-2 mt-2">
          <p className="text-3xl font-bold text-gray-800">{todayOrders.toLocaleString()}</p>
          <div className={`flex items-center ${anomalyColor}`}>
              <span className="text-lg font-bold">{isPositive ? '▲' : '▼'} {Math.abs(anomalyPercentage).toFixed(1)}%</span>
              <span className="text-xs ml-1 font-semibold">vs 7d avg</span>
          </div>
      </div>
      <div className="flex-grow w-full h-48 mt-4 -mb-4">
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: -5}}>
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(243, 244, 246, 0.7)' }}/>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#9ca3af" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" axisLine={false} tickLine={false}/>
                <Bar dataKey="orders" barSize={12} name="Orders">
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.orders, entry.average, index === 6)} radius={[3, 3, 0, 0]}/>
                    ))}
                </Bar>
                <Line type="monotone" dataKey="average" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="3 3" name="7-Day Average"/>
            </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default OrderComparison;
