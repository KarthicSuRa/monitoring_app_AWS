import React from 'react';

const timeFilters = ['1h', '4h', '8h', '24h', '48h', '7d', '30d'];

interface TimeFilterProps {
  selectedTime: string;
  setSelectedTime: (time: string) => void;
}

const TimeFilter: React.FC<TimeFilterProps> = ({ selectedTime, setSelectedTime }) => {
  return (
    <div className="flex items-center bg-white p-2 rounded-lg shadow ml-4">
      <span className="text-sm mr-2">Time:</span>
      {timeFilters.map(time => (
        <button
          key={time}
          onClick={() => setSelectedTime(time)}
          className={`px-3 py-1 text-sm font-semibold rounded-md mr-2 ${
            selectedTime === time
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800'
          }`}>
          {time}
        </button>
      ))}
    </div>
  );
};

export default TimeFilter;
