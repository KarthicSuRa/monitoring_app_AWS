
import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';

// Mock API function - replace with your actual API call
const getTrackingData = async (trackingNumber: string) => {
  console.log(`Fetching tracking data for ${trackingNumber}...`);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Mock responses based on tracking number
  if (trackingNumber === '1Z999ABC123') {
    return {
      carrier: 'UPS',
      events: [
        { status: 'DELIVERED', date: '2023-10-27T14:30:00Z', location: 'New York, NY', description: 'Left at front door.' },
        { status: 'OUT_FOR_DELIVERY', date: '2023-10-27T08:00:00Z', location: 'New York, NY', description: 'Out for delivery.' },
        { status: 'IN_TRANSIT', date: '2023-10-26T18:00:00Z', location: 'Secaucus, NJ', description: 'Arrived at hub.' },
        { status: 'SHIPPED', date: '2023-10-25T12:00:00Z', location: 'Los Angeles, CA', description: 'Shipment created.' },
      ]
    };
  } else {
    return {
        carrier: 'FedEx',
        events: [
          { status: 'IN_TRANSIT', date: '2023-10-28T10:15:00Z', location: 'Memphis, TN', description: 'In transit to destination.' },
          { status: 'SHIPPED', date: '2023-10-27T19:45:00Z', location: 'San Francisco, CA', description: 'Picked up by carrier.' },
        ]
      };
  }
};

const CarrierTrackingWidget = ({ trackingNumber }: { trackingNumber: string | null }) => {
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);

  useEffect(() => {
    if (trackingNumber) {
      setLoading(true);
      getTrackingData(trackingNumber)
        .then(data => setTrackingData(data))
        .finally(() => setLoading(false));
    }
  }, [trackingNumber]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-start space-x-4">
              <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!trackingData) {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center">
         <Icon name="package" className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-sm text-gray-500">Select a tracking number from the shipments list to view live updates.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <h3 className="font-bold text-lg mb-4">{trackingData.carrier} Tracking</h3>
      <div className="space-y-4">
        {trackingData.events.map((event: any, index: number) => (
          <div key={index} className={`flex items-start space-x-4 ${index === 0 ? 'font-bold' : ''}`}>
             <Icon name="check-circle" className={`h-6 w-6 ${index === 0 ? 'text-blue-500' : 'text-gray-400'}`} />
            <div className="flex-1">
              <p className="text-sm">{event.description}</p>
              <p className="text-xs text-gray-500">{new Date(event.date).toLocaleString()} - {event.location}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CarrierTrackingWidget;
