
import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface Warehouse {
  name: string;
  coords: [number, number];
  status: 'online' | 'offline';
  latency: number;
}

const warehouses: Warehouse[] = [
  { name: 'Hong Kong', coords: [22.3193, 114.1694], status: 'online', latency: 50 },
  { name: 'Singapore', coords: [1.3521, 103.8198], status: 'online', latency: 60 },
  { name: 'Germany', coords: [51.1657, 10.4515], status: 'online', latency: 80 },
  { name: 'United Kingdom', coords: [55.3781, -3.4360], status: 'online', latency: 75 },
  { name: 'US - West', coords: [36.7783, -119.4179], status: 'online', latency: 120 },
  { name: 'US - Central', coords: [31.9686, -99.9018], status: 'online', latency: 110 },
  { name: 'US - East', coords: [40.7128, -74.0060], status: 'offline', latency: 300 },
];

const WarehouseMap: React.FC = () => {
  return (
    <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm flex flex-col">
      <div className="p-3 border-b border-gray-200/80 flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.255 15.245L1.5 12l1.755-3.245m17.49 6.49L22.5 12l-1.755-3.245M12 21.75V19.5M12 4.5V2.25" />
            </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Global Warehouse Status</h3>
          <p className="text-xs text-gray-500">Real-time latency and uptime.</p>
        </div>
      </div>
      <div className="rounded-b-xl overflow-hidden" style={{ height: '350px' }}>
        <MapContainer 
            center={[25, 10]} 
            zoom={1.5} 
            style={{ height: '100%', width: '100%' }} 
            scrollWheelZoom={false} 
            className="z-0"
            maxBounds={[[-85, -180], [85, 180]]}
            maxBoundsViscosity={1.0}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            noWrap={true}
          />
          {warehouses.map(warehouse => {
            const isOnline = warehouse.status === 'online' && warehouse.latency < 150;
            return (
              <CircleMarker
                key={warehouse.name}
                center={warehouse.coords}
                radius={5}
                pathOptions={{
                  color: isOnline ? '#22c55e' : '#ef4444',
                  fillColor: isOnline ? '#22c55e' : '#ef4444',
                  fillOpacity: 0.8,
                  weight: 1.5,
                }}
              >
                <Tooltip offset={[0, -10]}>
                  <div className="p-1">
                    <p className="font-bold text-gray-800 text-sm">{warehouse.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <p className="text-xs text-gray-600">{warehouse.status === 'online' ? 'Online' : 'Offline'} - {warehouse.latency}ms</p>
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default WarehouseMap;
