import React from 'react';

const countries = ['ALL', 'US', 'UK', 'DE', 'CH', 'JP', 'SG', 'KR'];

interface CountrySelectorProps {
  selectedCountry: string;
  setSelectedCountry: (country: string) => void;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({ selectedCountry, setSelectedCountry }) => {
  return (
    <div className="flex items-center bg-white p-2 rounded-lg shadow">
      <span className="text-sm mr-2">Country:</span>
      {countries.map(country => (
        <button
          key={country}
          onClick={() => setSelectedCountry(country)}
          className={`px-3 py-1 text-sm font-semibold rounded-md mr-2 ${
            selectedCountry === country
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800'
          }`}>
          {country}
        </button>
      ))}
    </div>
  );
};

export default CountrySelector;
