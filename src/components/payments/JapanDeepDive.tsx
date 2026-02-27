
import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import DeclineCodes from './DeclineCodes';
import { Icon } from '../ui/Icon';

const declineTimelineData = [
    { time: '12:00', 'Do Not Honor': 30, 'Insufficient Funds': 20, 'Generic Decline': 5, 'Card Velocity Exceeded': 2, 'Expired Card': 3, 'Incorrect CVC': 1, 'Processor Declined': 4, 'Fraudulent': 2, 'Other': 5 },
    { time: '12:05', 'Do Not Honor': 35, 'Insufficient Funds': 25, 'Generic Decline': 7, 'Card Velocity Exceeded': 3, 'Expired Card': 2, 'Incorrect CVC': 2, 'Processor Declined': 3, 'Fraudulent': 1, 'Other': 6 },
    { time: '12:10', 'Do Not Honor': 85, 'Insufficient Funds': 30, 'Generic Decline': 10, 'Card Velocity Exceeded': 4, 'Expired Card': 5, 'Incorrect CVC': 3, 'Processor Declined': 15, 'Fraudulent': 5, 'Other': 8 },
    { time: '12:15', 'Do Not Honor': 90, 'Insufficient Funds': 28, 'Generic Decline': 12, 'Card Velocity Exceeded': 5, 'Expired Card': 4, 'Incorrect CVC': 2, 'Processor Declined': 20, 'Fraudulent': 6, 'Other': 7 },
    { time: '12:20', 'Do Not Honor': 40, 'Insufficient Funds': 22, 'Generic Decline': 8, 'Card Velocity Exceeded': 3, 'Expired Card': 3, 'Incorrect CVC': 1, 'Processor Declined': 5, 'Fraudulent': 2, 'Other': 5 },
    { time: '12:25', 'Do Not Honor': 38, 'Insufficient Funds': 24, 'Generic Decline': 6, 'Card Velocity Exceeded': 2, 'Expired Card': 4, 'Incorrect CVC': 2, 'Processor Declined': 4, 'Fraudulent': 3, 'Other': 6 },
];

const declineCodeColors = {
    "Do Not Honor": "#ef4444",
    "Insufficient Funds": "#f97316",
    "Generic Decline": "#dc2626",
    "Card Velocity Exceeded": "#8b5cf6",
    "Expired Card": "#6366f1",
    "Incorrect CVC": "#06b6d4",
    "Processor Declined": "#f59e0b",
    "Fraudulent": "#ec4899",
    "Other": "#6b7280"
};

const paymentMethods = [
    { name: 'Credit Card', provider: 'Cybersource', volume: '70.2%', success: 98.2, icon: 'credit-card' },
    { name: 'Amazon Pay', provider: 'Amazon Pay', volume: '15.5%', success: 99.8, icon: 'amazon' },
    { name: 'Paidy', provider: 'Paidy', volume: '10.3%', success: 97.5, icon: 'paidy' },
    { name: 'Cash On Delivery (COD)', provider: '–', volume: '4.0%', success: 100, icon: 'cash' },
];

const transactions = [
    { time: '12:21:20', amount: '¥15,000', provider: 'Credit Card', status: 'failed', reason: 'do_not_honor', orderId: 'a1b2c-3456' },
    { time: '12:21:18', amount: '¥7,550', provider: 'Amazon Pay', status: 'succeeded', reason: '', orderId: 'd4e5f-6789' },
    { time: '12:21:15', amount: '¥25,000', provider: 'Paidy', status: 'succeeded', reason: '', orderId: 'g7h8i-9012' },
    { time: '12:21:12', amount: '¥4,500', provider: 'Credit Card', status: 'succeeded', reason: '', orderId: 'j1k2l-3456' },
    { time: '12:21:09', amount: '¥12,500', provider: 'Credit Card', status: 'succeeded', reason: '', orderId: 'm3n4o-5678' },
];

const japanDeclineData = [
  { name: 'Do Not Honor', value: 92, color: '#EF4444' },
  { name: 'Transaction Not Permitted', value: 85, color: '#F97316' },
  { name: 'Invalid Transaction', value: 50, color: '#F59E0B' },
  { name: 'Suspected Fraud', value: 35, color: '#EAB308' },
];

const StatusBadge: React.FC<{ status: string; reason?: string }> = ({ status, reason }) => {
    const isSuccess = status === 'succeeded';
    const bgColor = isSuccess ? 'bg-green-100' : 'bg-red-100';
    const textColor = isSuccess ? 'text-green-800' : 'text-red-800';
    const iconName = isSuccess ? 'check-circle' : 'x-circle';

    return (
        <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${bgColor} ${textColor}`}>
            <Icon name={iconName} className="h-3.5 w-3.5" />
            <span>{isSuccess ? 'Succeeded' : `Failed ${reason ? `(${reason})` : ''}`}</span>
        </div>
    );
};

const JapanDeepDive: React.FC = () => {
  const [visibleCodes, setVisibleCodes] = useState(Object.keys(declineCodeColors));

  const handleLegendClick = (dataKey:any) => {
    if (visibleCodes.includes(dataKey)) {
      setVisibleCodes(visibleCodes.filter(code => code !== dataKey));
    } else {
      setVisibleCodes([...visibleCodes, dataKey]);
    }
  };

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Top Decline Codes</h3>
                <div className="bg-white p-4 rounded-lg shadow">
                    <DeclineCodes data={japanDeclineData} />
                </div>
            </div>
            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Decline Code Timeline</h3>
                <div className="bg-white p-4 rounded-lg shadow h-64 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={declineTimelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} />
                            <YAxis stroke="#9CA3AF" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}/>
                            <Legend onClick={(e) => handleLegendClick(e.dataKey)} wrapperStyle={{fontSize: "12px", paddingTop: '10px'}}/>
                            {Object.keys(declineCodeColors).map(code => (
                                visibleCodes.includes(code) && 
                                <Area key={code} type="monotone" dataKey={code} stackId="1" stroke={declineCodeColors[code]} fill={declineCodeColors[code]} name={code} />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Methods</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                  <table className="w-full min-w-max text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3 font-medium">Method</th>
                        <th className="px-6 py-3 font-medium text-right">Volume</th>
                        <th className="px-6 py-3 font-medium text-right">Success Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paymentMethods.map(method => (
                        <tr key={method.name} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                                <Icon name={method.icon} className="h-5 w-5 text-gray-400" />
                                <span className="font-medium text-gray-900">{method.name}</span>
                                {method.provider && <span className="text-gray-500">({method.provider})</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-gray-600">{method.volume}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className={`inline-block h-2.5 w-full max-w-[100px] rounded-full bg-gray-200`}>
                                <div 
                                    className={`h-2.5 rounded-full ${method.success > 95 ? 'bg-green-500' : method.success > 90 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                    style={{ width: `${method.success}%`}}
                                ></div>
                            </div>
                            <span className="ml-2 font-semibold font-mono text-gray-700">{method.success.toFixed(1)}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Live Transaction Firehose</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                  <table className="w-full min-w-max text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3 font-medium">Timestamp</th>
                        <th className="px-6 py-3 font-medium">Order ID</th>
                        <th className="px-6 py-3 font-medium text-right">Amount</th>
                        <th className="px-6 py-3 font-medium">Payment Method</th>
                        <th className="px-6 py-3 font-medium text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 font-mono">
                        {transactions.map(tx => (
                          <tr key={tx.orderId} className={`hover:bg-gray-50 ${tx.status === 'failed' ? 'bg-red-50/50' : ''}`}>
                            <td className="px-6 py-3 whitespace-nowrap text-gray-600">{tx.time}</td>
                            <td className="px-6 py-3 whitespace-nowrap text-gray-800">{tx.orderId}</td>
                            <td className="px-6 py-3 whitespace-nowrap text-right text-gray-800">{tx.amount}</td>
                            <td className="px-6 py-3 whitespace-nowrap text-gray-600">{tx.provider}</td>
                            <td className="px-6 py-3 whitespace-nowrap text-center">
                                <StatusBadge status={tx.status} reason={tx.reason} />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
            </div>
        </div>
    </div>
  );
};

export default JapanDeepDive;
