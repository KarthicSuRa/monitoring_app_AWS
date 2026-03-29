import React from 'react';
import { format, isToday } from 'date-fns';
import releaseEvents from '../../data/release_events.json';
import { CalendarEvent } from '../../types';
import { Icon } from '../ui/Icon';

export const EventBanner: React.FC = () => {
  const todayEvents = (releaseEvents as CalendarEvent[]).filter(event => isToday(new Date(event.start)));

  if (todayEvents.length === 0) {
    return null;
  }

  return (
    <div className="bg-green-100 dark:bg-green-900/50 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Today's Release Events</h2>
        <Icon name="calendar" className="h-6 w-6" />
      </div>
      <ul className="mt-2 space-y-2">
        {todayEvents.map(event => (
          <li key={event.id} className="p-2 bg-white/50 dark:bg-slate-800/50 rounded-md shadow-sm">
            <p className="font-semibold text-base">{event.title}</p>
            <p className="text-sm opacity-90">{event.description}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Category: {event.category}</span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{format(new Date(event.start), 'p')}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};