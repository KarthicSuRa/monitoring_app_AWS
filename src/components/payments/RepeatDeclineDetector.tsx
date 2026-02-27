
import React from 'react';

const declines = [
  { id: 'C012284D', attempts: 4, last: '1 min ago' },
  { id: 'C012285E', attempts: 3, last: '5 min ago' },
  { id: 'C012286F', attempts: 2, last: '12 min ago' },
];

const RepeatDeclineDetector: React.FC = () => {
  return (
    <div className="h-full flex flex-col p-4 bg-white rounded-lg">
      <div className="space-y-2 text-sm">
        {declines.map(d => (
          <div key={d.id} className="grid grid-cols-3 items-center gap-2 border-b border-gray-200 pb-1">
            <span className="text-gray-600 font-mono col-span-1">{d.id}</span>
            <span className="text-center col-span-1"><span className="font-bold text-orange-600">{d.attempts}</span> attempts</span>
            <span className="text-gray-500 text-right col-span-1">{d.last}</span>
          </div>
        ))}
      </div>
      <button className="mt-auto text-xs text-blue-600 hover:text-blue-500 w-full text-left pt-2">
          Expand List (3)
      </button>
    </div>
  );
};

export default RepeatDeclineDetector;
