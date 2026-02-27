
import React from 'react';
import { Link } from 'react-router-dom';

interface LiveOrdersFirehoseProps {
  selectedCountry: string;
  selectedTime: string;
}

const countryTotalOrders: { [key: string]: number } = {
  ALL: 249,
  US: 90,
  DE: 75,
  CH: 43,
  SG: 15,
  UK: 15,
  KR: 3,
  JP: 8,
};

const countryOrdersData = Object.keys(countryTotalOrders).filter(key => key !== 'ALL').map(key => ({ country: key, orders: countryTotalOrders[key] }));
const totalOrders = countryTotalOrders.ALL;

const getRandomCountry = (selectedCountry: string) => {
  if (selectedCountry !== 'ALL') {
    return selectedCountry;
  }
  const rand = Math.random() * totalOrders;
  let cumulative = 0;
  for (const country of countryOrdersData) {
    cumulative += country.orders;
    if (rand < cumulative) {
      return country.country;
    }
  }
  return countryOrdersData[0].country;
};

const generateRandomOrders = (count: number, selectedCountry: string) => {
    const orders = [];
    const now = new Date();
    const startId = 10000 + totalOrders;
    const paymentStatuses = ['Paid', 'Paid', 'Paid', 'Paid', 'Failed'];
    const sfccStatuses = ['Exported', 'Exported', 'Stuck', 'Pending'];
    const somStatuses = ['Ingested', 'Pending', '-'];

    for (let i = 0; i < count; i++) {
        const time = new Date(now.getTime() - i * (Math.random() * 5000 + 1000));
        const payment = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
        let sfcc = '-';
        let som = '-';
        let final = 'Pending';

        if (payment === 'Paid') {
            sfcc = sfccStatuses[Math.floor(Math.random() * sfccStatuses.length)];
        } else {
            final = 'Failed';
        }

        if (sfcc === 'Exported') {
            som = somStatuses[Math.floor(Math.random() * somStatuses.length)];
        } else if (sfcc === 'Stuck') {
            final = 'Intermediary';
        }

        if (som === 'Ingested') {
            final = 'Completed';
        } else if (som === 'Pending') {
            final = 'Intermediary';
        }

        if (final === 'Pending' && payment === 'Failed') {
            final = 'Failed';
        }
        if (final === 'Completed') {
            if (payment === 'Failed' || sfcc !== 'Exported' || som !== 'Ingested') {
                final = 'Intermediary'; 
            }
        }

        orders.push({
            id: `Ord-${startId - i}`,
            time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            country: getRandomCountry(selectedCountry),
            payment: payment,
            sfcc: sfcc,
            som: som,
            final: final,
        });
    }
    return orders;
};

const getOrderCount = (selectedCountry: string, selectedTime: string): number => {
    const baseCount = countryTotalOrders[selectedCountry] || countryTotalOrders.ALL;
    let timeMultiplier = 1;

    switch(selectedTime) {
        case '1h': timeMultiplier = 1/24; break;
        case '4h': timeMultiplier = 4/24; break;
        case '8h': timeMultiplier = 8/24; break;
        case '24h': timeMultiplier = 1; break;
        case '48h': timeMultiplier = 2; break;
        case '7d': timeMultiplier = 7; break;
        case '30d': timeMultiplier = 30; break;
    }
    
    // Ensure a minimum of 1 and a maximum of 50 for realistic display
    return Math.max(1, Math.min(50, Math.round(baseCount * timeMultiplier)));
}

const LiveOrdersFirehose: React.FC<LiveOrdersFirehoseProps> = ({ selectedCountry, selectedTime }) => {
  const orderCount = getOrderCount(selectedCountry, selectedTime);
  const orders = generateRandomOrders(orderCount, selectedCountry);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Paid':
      case 'Exported':
      case 'Ingested':
      case 'Completed':
        return 'text-green-600';
      case 'Pending':
      case 'Intermediary':
      case 'Stuck':
        return 'text-yellow-600';
      case 'Failed':
        return 'text-red-600';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow col-span-2">
      <h2 className="text-lg font-semibold mb-4">Live Orders Firehose ({selectedCountry}, {selectedTime})</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
            <thead>
            <tr className="border-b">
                <th className="p-2">Order ID</th>
                <th className="p-2">Time</th>
                <th className="p-2">Country</th>
                <th className="p-2">Payment</th>
                <th className="p-2">SFCC</th>
                <th className="p-2">SOM</th>
                <th className="p-2">Final Status</th>
            </tr>
            </thead>
            <tbody>
            {orders.map((order) => (
                <tr key={order.id} className="border-b">
                <td className="p-2 whitespace-nowrap">
                    <Link to={`/order-tracking/${order.id}`} className="text-blue-600 hover:underline">
                        {order.id}
                    </Link>
                </td>
                <td className="p-2 whitespace-nowrap">{order.time}</td>
                <td className="p-2">{order.country}</td>
                <td className={`p-2 ${getStatusStyle(order.payment)}`}>{order.payment}</td>
                <td className={`p-2 ${getStatusStyle(order.sfcc)}`}>{order.sfcc}</td>
                <td className={`p-2 ${getStatusStyle(order.som)}`}>{order.som}</td>
                <td className={`p-2 font-semibold ${getStatusStyle(order.final)}`}>{order.final}</td>
                </tr>
            ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default LiveOrdersFirehose;
