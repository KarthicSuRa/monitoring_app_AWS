
export interface OrderLifecycleData {
  orderId: string;
  stages: LifecycleStage[];
}

export interface LifecycleStage {
  stageName: 'SFCC' | 'SOM' | 'Warehouse' | 'Shipping' | 'Delivery' | 'Post-Sale';
  status: 'Complete' | 'In Progress' | 'Pending' | 'Error';
  statusText: string;
  events: StageEvent[];
  details: any; 
}

export interface StageEvent {
  id: string;
  name: string;
  timestamp: string;
  isError?: boolean;
  data?: any; 
}

export const orderLifecycleData: OrderLifecycleData = {
  orderId: 'HIVE-98765B',
  stages: [
    {
      stageName: 'SFCC', // Salesforce Commerce Cloud
      status: 'Complete',
      statusText: 'Order placed successfully',
      events: [
        { id: 'sfcc-1', name: 'Customer Cart Submitted', timestamp: '2023-10-26 07:58 AM' },
        { id: 'sfcc-2', name: 'Order Created in SFCC', timestamp: '2023-10-26 08:00 AM' },
        { id: 'sfcc-3', name: 'Fraud Check Passed', timestamp: '2023-10-26 08:01 AM' },
        { id: 'sfcc-4', name: 'Order Exported to SOM', timestamp: '2023-10-26 08:02 AM' },
      ],
      details: {
        channel: 'Web',
        customerIP: '192.168.1.1',
      },
    },
    {
      stageName: 'SOM', // Sterling Order Management
      status: 'Complete',
      statusText: 'Payment processed',
      events: [
        { id: 'som-1', name: 'Order Ingested', timestamp: '2023-10-26 08:03 AM' },
        {
          id: 'som-2',
          name: 'Payment Authorization',
          timestamp: '2023-10-26 08:04 AM',
          data: { gateway: 'Stripe', transactionId: 'pi_3O5f...XYZ', result: 'Authorized' },
        },
        {
          id: 'som-3',
          name: 'Payment Capture',
          timestamp: '2023-10-26 11:35 AM',
          data: { gateway: 'Stripe', transactionId: 'pi_3O5f...XYZ', result: 'Captured', amount: 249.99 },
        },
        { id: 'som-4', name: 'Release to Fulfillment', timestamp: '2023-10-26 11:36 AM' },
        {
            id: 'som-5',
            name: 'Email Sent: Order Confirmed',
            timestamp: '2023-10-26 08:05 AM',
            data: { template: 'order_confirmation_v2', recipient: 'CUST-2024-A87F' },
        },
      ],
      details: {},
    },
    {
      stageName: 'Warehouse',
      status: 'Complete',
      statusText: 'Ready for pickup',
      events: [
        { id: 'wh-1', name: 'ASN Received', timestamp: '2023-10-26 11:40 AM' },
        { id: 'wh-2', name: 'Items Picked', timestamp: '2023-10-26 12:30 PM' },
        { id: 'wh-3', name: 'Packed & Labeled', timestamp: '2023-10-26 01:10 PM' },
        { id: 'wh-4', name: 'Ready for Carrier Pickup', timestamp: '2023-10-26 01:15 PM' },
      ],
      details: {
        fulfillmentCenter: 'FC-DENVER-04',
        packageDimensions: '12x8x4 in',
        packageWeight: '2.5 lbs',
      },
    },
    {
      stageName: 'Shipping',
      status: 'In Progress',
      statusText: 'In transit to destination',
      events: [
        { id: 'ship-1', name: 'Carrier Picked Up', timestamp: '2023-10-26 05:00 PM' },
        {
          id: 'ship-2',
          name: 'Email Sent: Order Shipped',
          timestamp: '2023-10-26 05:05 PM',
          data: { template: 'order_shipped_notify', recipient: 'CUST-2024-A87F' },
      },
        { id: 'ship-3', name: 'Arrived at Sort Facility', timestamp: '2023-10-27 02:15 AM', data: { location: 'Kansas City, MO' } },
        { id: 'ship-4', name: 'Departed Sort Facility', timestamp: '2023-10-27 08:30 AM', data: { location: 'Kansas City, MO' } },
      ],
      details: {
        carrier: 'Hive Logistics',
        trackingNumber: 'HIVE-L-98765B-XYZ',
        service: '2-Day Express',
      },
    },
    {
      stageName: 'Delivery',
      status: 'Pending',
      statusText: 'Scheduled for delivery',
      events: [
        { id: 'del-1', name: 'Out for Delivery', timestamp: '' },
        { id: 'del-2', name: 'Delivered', timestamp: '' },
      ],
      details: {
        estimatedDelivery: '2023-10-28',
      },
    },
    {
        stageName: 'Post-Sale',
        status: 'Pending',
        statusText: 'Eligible for returns',
        events: [],
        details: {
            returnWindowCloses: '2023-11-27',
        },
    },
  ],
};
