
import React from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { ArrowUp, ArrowDown } from 'lucide-react';

// Data for the charts and metrics
const declineReasonData = [
  { name: 'Insufficient Funds', value: 400 },
  { name: 'Fraud/Risk', value: 300 },
  { name: 'Issuer Technical', value: 180 },
  { name: 'Invalid Details', value: 120 },
  { name: 'Other', value: 200 },
];
const COLORS = ['#F97316', '#EF4444', '#F59E0B', '#EAB308', '#6B7280'];

const paymentMethodData = [
  { name: 'Credit/Debit', success: 98.2, volume: 75 },
  { name: 'Digital Wallets', success: 99.5, volume: 15 },
  { name: 'PayPal', success: 98.9, volume: 8 },
  { name: 'Bank Transfers', success: 96.5, volume: 2 },
];

// Custom label for Pie Chart
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};


const GlobalExecutive: React.FC = () => {
  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Regional success rates */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">North America</p>
          <p className="text-3xl font-bold text-green-600">99.4%</p>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Europe</p>
          <p className="text-3xl font-bold text-green-600">98.1%</p>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Asia Pacific</p>
          <p className="text-3xl font-bold text-yellow-500">97.8%</p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow">
        {/* Left Column */}
        <div className="space-y-6">
          <div >
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Key Metrics (24h)</h3>
            <div className="grid grid-cols-3 gap-4 text-center bg-white p-4 rounded-lg shadow">
              <div>
                <p className="text-sm text-gray-500">Volume</p>
                <p className="text-2xl font-bold text-gray-800">1.23M</p>
                <p className="text-xs text-green-600 flex items-center justify-center"><ArrowUp size={14}/> 2.5%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Auth Rate</p>
                <p className="text-2xl font-bold text-green-600">98.2%</p>
                 <p className="text-xs text-red-600 flex items-center justify-center"><ArrowDown size={14}/> 0.2%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fraud Declines</p>
                <p className="text-2xl font-bold text-yellow-600">0.15%</p>
                 <p className="text-xs text-green-600 flex items-center justify-center"><ArrowUp size={14}/> 0.05%</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Payment Method Performance</h3>
            <div className="bg-white p-4 rounded-lg shadow space-y-4">
              {paymentMethodData.map((method) => (
                <div key={method.name}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">{method.name}</span>
                    <span className={`text-sm font-bold ${method.success > 98 ? 'text-green-600' : 'text-yellow-500'}`}>
                      {method.success}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${method.success > 98 ? 'bg-green-500' : 'bg-yellow-400'}`}
                      style={{ width: `${method.volume}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
            <div className="mt-12">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Top Decline Reasons</h3>
                <div className="bg-white p-4 rounded-lg shadow h-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={declineReasonData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                outerRadius={'80%'}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {declineReasonData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                             <Legend iconSize={10} wrapperStyle={{fontSize: "12px"}}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalExecutive;
