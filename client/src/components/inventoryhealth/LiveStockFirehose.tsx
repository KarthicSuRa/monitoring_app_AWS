
import React, { useState, useEffect } from 'react';

interface StockChangeEvent {
  sku: string;
  from: number;
  to: number;
  time: string;
}

// TODO: Replace with a real-time data source (e.g., WebSocket or polling OCI)
const initialEvents: StockChangeEvent[] = [
  { sku: 'NKE-AIR-MX-90', from: 5, to: 4, time: '14:31:05' },
  { sku: 'ADS-ULTRAB-21', from: 1, to: 0, time: '14:30:59' },
  { sku: 'PAT-SYNCH-FLC', from: 10, to: 9, time: '14:30:52' },
  { sku: 'TNF-NUPTSE-JKT', from: 0, to: 15, time: '14:30:45' },
];

const LiveStockFirehose: React.FC = () => {
  const [events, setEvents] = useState<StockChangeEvent[]>(initialEvents);

  // This effect simulates real-time updates. In a real app, you'd use a WebSocket.
  useEffect(() => {
    const interval = setInterval(() => {
      setEvents(prevEvents => [
        {
          sku: `SKU-${Math.floor(Math.random() * 1000)}`,
          from: Math.floor(Math.random() * 20),
          to: Math.floor(Math.random() * 20),
          time: new Date().toLocaleTimeString(),
        },
        ...prevEvents.slice(0, 3)
      ]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getChangeColor = (from: number, to: number) => {
    if (to === 0) return 'text-red-500';
    if (to > from) return 'text-green-500';
    return 'text-gray-500';
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-500">Live Stock Firehose</h3>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto" style={{maxHeight: '150px'}}>
            {events.map((event, index) => (
                <div key={index} className="flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-400">{event.time}</span>
                    <span className="font-semibold text-gray-700 truncate mx-2">{event.sku}</span>
                    <div className={getChangeColor(event.from, event.to)}>
                        <span className="font-bold">{event.from} → {event.to}</span>
                    </div>
                </div>
            ))}
        </div>
        <div className="text-xs text-gray-400 text-center mt-3">
            <span>Real-time stock changes. Critical on any drop to <strong>0</strong>.</span>
        </div>
    </div>
  );
};

export default LiveStockFirehose;
