
import React from 'react';
import { ArrowDown } from 'lucide-react';

const lanes = [
  { country: 'JP', provider: 'PayPay', success: '83.2%', volume: 1847 },
  { country: 'DE', provider: 'Sofort', success: '88.9%', volume: 812 },
  { country: 'US', provider: 'Amex', success: '90.1%', volume: 2103 },
  { country: 'FR', provider: 'Carte Bancaire', success: '91.5%', volume: 5432 },
  { country: 'UK', provider: 'Stripe', success: '92.3%', volume: 10231 },
];

const WorstLanes: React.FC = () => {
  return (
    <div className="h-full flex flex-col p-4 bg-white rounded-lg">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Worst 5 Lanes Right Now</h2>
      <div className="flex-grow">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="pb-2">Lane</th>
              <th className="pb-2 text-right">Success %</th>
              <th className="pb-2 text-right">Volume (15 min)</th>
            </tr>
          </thead>
          <tbody>
            {lanes.map((lane, index) => (
              <tr key={index} className="border-t border-gray-200">
                <td className="py-2 text-gray-800">{lane.country} → {lane.provider}</td>
                <td className="py-2 text-right font-mono text-red-600">{lane.success}</td>
                <td className="py-2 text-right font-mono text-gray-500 flex items-center justify-end">
                  <ArrowDown className="h-4 w-4 mr-1 text-red-600" />
                  {lane.volume.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WorstLanes;
