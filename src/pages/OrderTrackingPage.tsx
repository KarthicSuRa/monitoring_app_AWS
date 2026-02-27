
import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Notification, SystemStatusData, Session } from '../types';

// --- Helper Components ---

const Icon = ({ name, className = '' }) => (
    <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const OrderSubHeader = ({ orderId, status, store, placedDate }) => (
    <div className="px-6 py-4">
        <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">{orderId}</h2>
            <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                {status}
            </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
            <div className="flex items-center gap-1.5">
                <Icon name="store" className="text-sm" />
                <span>{store}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <Icon name="calendar_today" className="text-sm" />
                <span>Placed: {placedDate}</span>
            </div>
        </div>
    </div>
);

const Timeline = ({ stages }) => {
    const activeIndex = stages.findIndex(s => s.status === 'active');
    
    return (
        <div className="px-10 py-8">
            <div className="relative flex justify-between items-start">
                {/* Progress Bar */}
                <div className="absolute top-5 left-0 w-full h-1 bg-gray-200">
                    <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${(activeIndex / (stages.length - 1)) * 100}%` }}
                    ></div>
                </div>

                {stages.map((stage, index) => {
                    const isCompleted = stage.status === 'completed';
                    const isActive = stage.status === 'active';
                    const isPending = stage.status === 'pending';
                    
                    return (
                        <div key={index} className="z-10 flex flex-col items-center text-center w-28">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 ${isActive ? 'bg-blue-500 border-white shadow-lg' : isCompleted ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}>
                                <Icon name={stage.icon} className={isPending ? 'text-gray-400' : 'text-white'} />
                            </div>
                            <h3 className="text-xs font-bold mt-3">{stage.name}</h3>
                            <p className={`text-xs ${isActive ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>{stage.source}</p>
                            <p className="text-xs text-gray-500 mt-1">{stage.date}</p>
                            <p className="text-xs text-gray-500">{stage.time}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const Tabs = ({ activeTab, setActiveTab }) => (
    <div className="border-b border-gray-200 px-6">
        <nav className="-mb-px flex space-x-6">
            <button 
                onClick={() => setActiveTab('line-items')}
                className={`py-3 px-1 border-b-2 font-semibold text-sm ${activeTab === 'line-items' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
                Line Items
            </button>
            <button 
                onClick={() => setActiveTab('inventory-status')}
                className={`py-3 px-1 border-b-2 font-semibold text-sm ${activeTab === 'inventory-status' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
                Inventory Status
            </button>
        </nav>
    </div>
);

const LineItemsTable = ({ shipments, unfulfilled }) => (
    <div className="p-6 space-y-6">
        {/* Shipment 1 */}
        <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                        SHIPMENT 1 - FEDEX EXPRESS
                    </h3>
                    <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
                        Tracking: <span className="font-mono text-gray-800">1Z999AA1012391</span>
                    </div>
                </div>
            </div>
            <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                    <tr>
                        <th className="px-4 py-2 font-medium">SKU</th>
                        <th className="px-4 py-2 font-medium" colSpan={2}>PRODUCT</th>
                        <th className="px-4 py-2 font-medium text-right">QTY</th>
                        <th className="px-4 py-2 font-medium text-right">UNIT PRICE</th>
                        <th className="px-4 py-2 font-medium text-right">TOTAL</th>
                        <th className="px-4 py-2 font-medium text-center">LOC</th>
                        <th className="px-4 py-2 font-medium text-center">STATUS</th>
                    </tr>
                </thead>
                <tbody>
                    {shipments.map((item, i) => (
                        <tr key={i} className="border-t border-gray-200">
                            <td className="px-4 py-3 font-mono">{item.sku}</td>
                            <td className="px-4 py-3" colSpan={2}>
                                <div className="flex items-center gap-3">
                                    <img src={item.img} alt={item.product} className="w-10 h-10 rounded-md border border-gray-200 object-cover" />
                                    <span>{item.product}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right">{item.qty}</td>
                            <td className="px-4 py-3 text-right font-mono">${item.price.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-semibold font-mono">${item.total.toFixed(2)}</td>
                            <td className="px-4 py-3 text-center font-mono">{item.loc}</td>
                            <td className="px-4 py-3 text-center">
                                <span className="bg-green-100 text-green-700 font-semibold text-xs px-2 py-1 rounded-full">{item.status}</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Unfulfilled */}
        <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span>
                    UNFULFILLED - WAREHOUSE 2
                </h3>
            </div>
             <table className="w-full text-sm">
                <thead className="text-left text-gray-500 sr-only">
                    <tr>
                        <th className="px-4 py-2 font-medium">SKU</th>
                        <th className="px-4 py-2 font-medium" colSpan={2}>PRODUCT</th>
                        <th className="px-4 py-2 font-medium text-right">QTY</th>
                        <th className="px-4 py-2 font-medium text-right">UNIT PRICE</th>
                        <th className="px-4 py-2 font-medium text-right">TOTAL</th>
                        <th className="px-4 py-2 font-medium text-center">LOC</th>
                        <th className="px-4 py-2 font-medium text-center">STATUS</th>
                    </tr>
                </thead>
                <tbody>
                    {unfulfilled.map((item, i) => (
                        <tr key={i}>
                            <td className="px-4 py-3 font-mono">{item.sku}</td>
                            <td className="px-4 py-3" colSpan={2}>
                                <div className="flex items-center gap-3">
                                    <img src={item.img} alt={item.product} className="w-10 h-10 rounded-md border border-gray-200 object-cover" />
                                    <span>{item.product}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right">{item.qty}</td>
                            <td className="px-4 py-3 text-right font-mono">${item.price.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-semibold font-mono">${item.total.toFixed(2)}</td>
                            <td className="px-4 py-3 text-center font-mono">{item.loc}</td>
                            <td className="px-4 py-3 text-center">
                                <span className="bg-yellow-100 text-yellow-700 font-semibold text-xs px-2 py-1 rounded-full">{item.status}</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const Financials = ({ paymentStatus, processor, method, total }) => (
    <div className="bg-white border border-gray-200 rounded-lg">
        <h3 className="px-4 py-3 font-semibold text-sm text-gray-800 border-b border-gray-200 flex items-center gap-2">
            <Icon name="receipt_long" className="text-gray-500 text-base" />
            FINANCIALS
        </h3>
        <div className="p-4 space-y-3 text-sm">
            <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Status</span>
                <span className="bg-green-100 text-green-700 font-bold text-xs px-2 py-0.5 rounded-full flex items-center gap-1.5">
                    <Icon name="check_circle" className="text-sm" />
                    {paymentStatus}
                </span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Processor</span>
                <div className="flex items-center gap-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-4" />
                    <span className="font-semibold text-gray-800">{processor}</span>
                </div>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Method</span>
                <div className="flex items-center gap-2">
                    <Icon name="credit_card" />
                    <span className="font-mono text-gray-800">{method}</span>
                </div>
            </div>
        </div>
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <span className="font-semibold text-gray-800">Total Amount</span>
            <span className="text-xl font-bold text-gray-900 font-mono">${total}</span>
        </div>
    </div>
);

const CommunicationsLog = ({ logs }) => (
    <div className="bg-white border border-gray-200 rounded-lg">
        <h3 className="px-4 py-3 font-semibold text-sm text-gray-800 border-b border-gray-200 flex items-center gap-2">
            <Icon name="forum" className="text-gray-500 text-base" />
            COMMUNICATIONS LOG
        </h3>
        <div className="p-4 space-y-4">
            {logs.map((log, i) => (
                <div key={i} className="flex gap-3">
                    <Icon name={log.icon} className="text-blue-500 mt-0.5" />
                    <div>
                        <div className="flex justify-between items-baseline">
                            <p className="font-semibold text-sm text-gray-800">{log.title}</p>
                            <p className="text-xs text-gray-500 font-mono">{log.date}</p>
                        </div>
                        <p className="text-sm text-gray-600">{log.description}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

interface OrderTrackingPageProps {
  notifications: Notification[];
  onNavigate: (page: string) => void;
  onLogout: () => Promise<void>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  openSettings: () => void;
  systemStatus: SystemStatusData;
  session: Session | null;
}

const OrderTrackingPage: React.FC<OrderTrackingPageProps> = ({ 
    notifications, 
    onNavigate, 
    onLogout, 
    isSidebarOpen, 
    setIsSidebarOpen, 
    openSettings, 
    systemStatus, 
    session 
}) => {
    const [activeTab, setActiveTab] = useState('line-items');

    const orderData = {
        id: '#J123564780',
        status: 'IN TRANSIT',
        store: 'US-Main Store',
        placedDate: 'Oct 24, 2023, 14:30',
    };

    const timelineStages = [
        { name: 'ORDER PLACED', source: 'SFCC', date: 'Oct 24', time: '14:38', status: 'completed', icon: 'shopping_bag' },
        { name: 'PROCESSING', source: 'SOM', date: 'Oct 24', time: '16:45', status: 'completed', icon: 'settings' },
        { name: 'FULFILLMENT', source: 'Warehouse', date: 'Oct 25', time: '09:15', status: 'completed', icon: 'warehouse' },
        { name: 'IN TRANSIT', source: 'Shipment', date: 'Oct 25', time: '18:00', status: 'active', icon: 'local_shipping' },
        { name: 'DELIVERY', source: 'Arrived', date: 'Est. Oct 27', time: '10:30', status: 'pending', icon: 'package' },
        { name: 'COMPLETION', source: 'Archived', date: '—', time: '', status: 'pending', icon: 'archive' }
    ];

    const shippedItems = [
        { sku: 'SKU-99281', product: 'Neon Running Shoes', img: 'https://i.imgur.com/62g2V32.png', qty: 1, price: 120.00, total: 120.00, loc: 'NY-A12', status: 'Shipped' },
        { sku: 'SKU-11029', product: 'Performance Socks', img: 'https://i.imgur.com/5h2SoiW.png', qty: 2, price: 15.00, total: 30.00, loc: 'NY-B04', status: 'Shipped' },
    ];
    
    const unfulfilledItems = [
        { sku: 'SKU-88392', product: 'Insulated Water Bottle - Matte Black', img: 'https://i.imgur.com/K6b2n8t.png', qty: 1, price: 25.00, total: 25.00, loc: 'CA-C01', status: 'Processing' },
    ];

    const financialData = {
        paymentStatus: 'PAID',
        processor: 'Stripe',
        method: 'Visa •••• 4242',
        total: '175.00',
    };

    const communicationLogs = [
        { title: 'Order Confirmation', date: 'Oct 24, 14:35', description: 'Sent to customer email (j.doe@example.com).', icon: 'email' },
        { title: 'Shipping Update', date: 'Oct 25, 09:12', description: 'Tracking number sent via SMS and Email.', icon: 'sms' },
    ];
    
    return (
        <>
            <Header 
                onNavigate={onNavigate} 
                onLogout={onLogout} 
                notifications={notifications} 
                isSidebarOpen={isSidebarOpen} 
                setIsSidebarOpen={setIsSidebarOpen} 
                openSettings={openSettings} 
                systemStatus={systemStatus} 
                session={session} 
                title="Order Tracker"
            />
            <main className="flex-1 overflow-y-auto bg-background md:ml-72">
                <div className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
                    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm mb-6 p-4 flex items-center gap-4">
                        <div className="relative w-full">
                            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search by Order ID, tracking number, or SKU..." 
                                className="bg-gray-100 border border-gray-300 rounded-md pl-10 pr-4 py-2 text-sm w-full focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <button className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-semibold hover:bg-blue-700">Track</button>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm mb-6">
                        <OrderSubHeader {...orderData} />
                        <Timeline stages={timelineStages} />
                    </div>

                    <div className="grid grid-cols-3 gap-6 items-start">
                        <div className="col-span-3 lg:col-span-2 bg-gray-50/50 rounded-lg">
                            <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
                            {activeTab === 'line-items' && <LineItemsTable shipments={shippedItems} unfulfilled={unfulfilledItems} />}
                            {activeTab === 'inventory-status' && <div className="p-6 text-gray-500">Inventory Status view not implemented yet.</div>}
                        </div>
                        <div className="col-span-3 lg:col-span-1 space-y-6">
                        <Financials {...financialData} />
                        <CommunicationsLog logs={communicationLogs} />
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
};

export default OrderTrackingPage;
