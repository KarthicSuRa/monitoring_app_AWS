
import React from 'react';
import UKDeepDive from './UKDeepDive';
import GermanyDeepDive from './GermanyDeepDive';
import SwitzerlandDeepDive from './SwitzerlandDeepDive';
import DeclineCodes from './DeclineCodes';

const regionDeclineData = [
  { name: 'Authentication Required', value: 110, color: '#EF4444' },
  { name: 'Insufficient Funds', value: 75, color: '#F97316' },
  { name: 'Transaction Not Allowed', value: 45, color: '#F59E0B' },
  { name: 'Card Blocked', value: 20, color: '#EAB308' },
  { name: 'Unsupported Card', value: 88, color: '#EF4444' },
  { name: 'Limit Exceeded', value: 72, color: '#F97316' },
  { name: 'System Error', value: 30, color: '#F59E0B' },
  { name: 'Invalid PIN', value: 15, color: '#EAB308' },
  { name: 'Risk Score Too High', value: 60, color: '#EF4444' },
  { name: 'Incorrect Details', value: 45, color: '#F97316' },
  { name: 'Account Closed', value: 30, color: '#F59E0B' },
  { name: 'Not Enrolled in 3D-Secure', value: 25, color: '#EAB308' },
];

const RegionDeepDive: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <UKDeepDive />
        <GermanyDeepDive />
        <SwitzerlandDeepDive />
      </div>
      <div>
        <DeclineCodes data={regionDeclineData} />
      </div>
    </div>
  );
};

export default RegionDeepDive;
