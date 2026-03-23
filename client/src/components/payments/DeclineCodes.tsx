
import React from 'react';
import { BarChart, Bar, YAxis, XAxis, ResponsiveContainer, Cell, LabelList } from 'recharts';

interface DeclineCodeData {
  name: string;
  value: number;
  color: string;
}

interface DeclineCodesProps {
  data: DeclineCodeData[];
}

const DeclineCodes: React.FC<DeclineCodesProps> = ({ data }) => {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          layout="vertical" 
          margin={{ top: 5, right: 30, bottom: 5, left: 100 }}
        >
          <XAxis type="number" hide />
          <YAxis 
            type="category" 
            dataKey="name" 
            stroke="#4B5563" 
            fontSize={12} 
            axisLine={false} 
            tickLine={false}
            width={100}
          />
          <Bar dataKey="value" barSize={15} radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList dataKey="value" position="right" style={{ fill: '#374151', fontSize: '12px' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DeclineCodes;
