import React from 'react';
import type { Event } from '../../data/TrackingData'; // Corrected Path

// Inline SVGs for the icons to keep the component self-contained
const icons = {
  'order-placed': <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
  'processing': <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  'shipped': <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  'delivery': <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
  'delivered': <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>,
};

interface OrderTimelineProps {
  events: Event[];
  selectedEventId?: string;
  orderNumber: string;
  customerName: string;
  onSelectEvent: (event: Event) => void;
}

const OrderTimeline: React.FC<OrderTimelineProps> = ({ events, selectedEventId, orderNumber, customerName, onSelectEvent }) => {
  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h1>Order {orderNumber}</h1>
        <p>For {customerName}</p>
      </div>
      {events.map(event => (
        <div 
          key={event.id}
          className={`timeline-card ${event.status} ${selectedEventId === event.id ? 'active' : ''}`}
          onClick={() => onSelectEvent(event)}
        >
          <div className="timeline-connector"></div>
          <div className="icon-container">
            {icons[event.id] || icons['delivered']}
          </div>
          <div className="card-content">
            <h3>{event.label}</h3>
            <p>{event.status === 'completed' || event.status === 'active' ? event.timestamp : "Pending"}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrderTimeline;
