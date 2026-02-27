
import React from 'react';

interface Country {
  code: string;
  name: string;
  emoji: string;
}

interface CountrySelectorProps {
  countries: Country[];
  selectedCountry: string;
  onCountryChange: (countryCode: string) => void;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({ countries, selectedCountry, onCountryChange }) => {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {countries.map(country => (
        <button
          key={country.code}
          onClick={() => onCountryChange(country.code)}
          className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-200 ease-in-out
            ${selectedCountry === country.code 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          {country.emoji} {country.name}
        </button>
      ))}
    </div>
  );
};

export default CountrySelector;
