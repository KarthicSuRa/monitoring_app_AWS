
import React from 'react';

interface TimeSinceLastOrderProps {
  selectedCountry: string;
  selectedTime: string;
}

// Base order counts for a 24-hour period
const countryOrders24h: { [key: string]: number } = {
    US: 90,
    DE: 75,
    CH: 43,
    SG: 15,
    UK: 15,
    KR: 3,
    JP: 8,
};

const TimeSinceLastOrder: React.FC<TimeSinceLastOrderProps> = ({ selectedCountry, selectedTime }) => {

  const getGapLogic = () => {
    const timeValue = parseInt(selectedTime.replace(/\D/g, ''));
    const timeUnit = selectedTime.replace(/\d/g, '');

    let durationInSeconds = 24 * 3600; // Default to 24h
    if (timeUnit === 'h') {
      durationInSeconds = timeValue * 3600;
    } else if (timeUnit === 'd') {
      durationInSeconds = timeValue * 24 * 3600;
    }

    const baseOrders = selectedCountry === 'ALL'
      ? Object.values(countryOrders24h).reduce((sum, orders) => sum + orders, 0)
      : countryOrders24h[selectedCountry] || 0;

    const ordersInPeriod = baseOrders * (durationInSeconds / (24 * 3600));
    const averageGap = ordersInPeriod > 0 ? durationInSeconds / ordersInPeriod : durationInSeconds;
    const normalGap = Math.ceil(averageGap * 2);
    // Simulate the current time since last order to be around the healthy/critical threshold
    const currentTime = Math.round(normalGap * (0.75 + Math.random() * 0.5));

    return { normalGap, currentTime };
  }

  const { normalGap, currentTime } = getGapLogic();

  const isCritical = currentTime >= normalGap;
  const color = isCritical ? '#ef4444' : '#22c55e'; // red-500 or green-500

  const radius = 42;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const gaugeMaxValue = normalGap > 0 ? normalGap * 1.75 : 60;
  const offset = circumference - (Math.min(currentTime, gaugeMaxValue) / gaugeMaxValue) * circumference;

  const formatTimeForDisplay = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    if (hours > 0) {
        return { value: hours, unit: 'hr', secondary: `${minutes} min` };
    }
    if (minutes > 0) {
        return { value: minutes, unit: 'min', secondary: `${seconds} sec` };
    }
    return { value: seconds, unit: 'sec', secondary: '' };
  };
  
  const formatGapText = (totalSeconds: number) => {
    if (totalSeconds < 1) return '<1 sec';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `~${hours}h ${minutes}m`;
    if (minutes > 0) return `~${minutes}m`;
    return `${Math.floor(totalSeconds)}s`;
  }

  const { value, unit, secondary } = formatTimeForDisplay(currentTime);

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col items-center justify-center">
        <div className="flex items-center gap-1.5 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-500">Time Since Last Order</h3>
        </div>
        <div className="w-24 h-24 relative my-1">
            <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="flex items-baseline">
                    <span className={`text-2xl font-bold`} style={{color}}>{value}</span>
                    <span className={`text-base font-semibold ml-1`} style={{color}}>{unit}</span>
                </div>
                {secondary && <span className="text-xs text-gray-400">{secondary}</span>}
            </div>
        </div>
      <p className="mt-1 text-xs text-gray-400 text-center">
        Normal Gap: &lt; {formatGapText(normalGap)}
      </p>
    </div>
  );
};

export default TimeSinceLastOrder;
