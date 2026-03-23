
import React from 'react';

const EuropeDeepDive: React.FC = () => {
  const countries = [
    { name: 'UK', value: '93.2%', status: 'bg-green-500' },
    { name: 'DE', value: '98.8%', status: 'bg-green-500' },
    { name: 'CH', value: '99.1%', status: 'bg-green-500' },
    { name: 'FR', value: '89.7%', status: 'bg-yellow-500' }, // Example of a different status
  ];

  return (
    <div className="h-full flex flex-col p-4 bg-white rounded-lg">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Europe Deep-Dive</h2>
      <div className="grid grid-cols-2 grid-rows-2 gap-4 flex-grow">
        {countries.map(country => (
            <div key={country.name} className={`p-3 rounded-lg flex items-center justify-between bg-opacity-20 border ${country.status.replace('bg-', 'border-')} ${country.status.replace('bg', 'bg')}`}>
                <span className="font-bold text-xl text-gray-700">{country.name}</span>
                <span className="text-2xl font-mono text-gray-800">{country.value}</span>
            </div>
        ))}
      </div>
    </div>
  );
};

export default EuropeDeepDive;
