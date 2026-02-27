
import React from 'react';

interface LocationsWithNoResponseProps {
  // Props if needed
}

const LocationsWithNoResponse: React.FC<LocationsWithNoResponseProps> = () => {
  // TODO: Replace with real data from OCI health check
  const nonResponsiveLocations = 2; // Example value

  const isCritical = nonResponsiveLocations >= 1;
  const color = isCritical ? '#ef4444' : '#22c55e';

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-sm font-medium text-gray-500">Locations with No Response</h3>
        </div>
        <p className="text-xs text-gray-400 mt-1 pl-7">Warehouse/store offline in OCI, causing inventory blind spots.</p>
      </div>

      <div className="text-center my-4">
        <span className="text-4xl font-bold" style={{ color }}>
          {nonResponsiveLocations}
        </span>
        <span className="text-lg font-semibold ml-1" style={{ color }}>Locations</span>
      </div>

      <div className="text-xs text-gray-400 text-center">
        <span>Critical when: <strong>≥ 1 location</strong></span>
      </div>
    </div>
  );
};

export default LocationsWithNoResponse;
