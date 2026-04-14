
import React from 'react';
import { User } from '../types';
import ParcelsAppWidget from '../components/tracking/ParcelsAppWidget';

interface OrderTrackingPageProps {
  user: User | null;
}

const OrderTrackingPage: React.FC<OrderTrackingPageProps> = ({ user }) => {
  const trackingNumber = "00340434197561734496";

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-slate-800 md:ml-72">
      
      {/* GLOBAL TOP NAVIGATION (Adapted from your design) */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-lg text-slate-800 tracking-tight">Order Details <span className="font-normal text-slate-400 mx-2">/</span> D10505564</span>
        </div>
        <div className="flex items-center space-x-6 text-sm font-medium text-slate-600">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Operational</span>
          </div>
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
             {user && user.full_name && (
                <>
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-sm">{user.full_name.toUpperCase()}</span>
                </>
             )}
          </div>
        </div>
      </div>

      {/* MAIN DASHBOARD CONTENT */}
      <div className="px-6 pb-10 max-w-[1600px] mx-auto">
        
        {/* Header Action Row */}
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Order D10505564</h1>
            <p className="text-sm text-slate-500 mt-1">Placed: April 5, 2026 • Channel: Web Store EU</p>
          </div>
          <div className="flex space-x-3 text-sm font-semibold">
            <span className="px-3 py-1 rounded bg-yellow-400 text-slate-900 shadow-sm border border-yellow-500">
              Exceptions Present
            </span>
            <span className="px-3 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200">
              SOM Ingested
            </span>
          </div>
        </div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN (Spans 2) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* ROW 1: Details Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-[15px] font-semibold text-slate-800 mb-4">Financial Summary</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Total Amount</span>
                    <span className="font-medium text-slate-800">€240.00</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Captured Amount</span>
                    <span className="font-semibold text-red-600">€0.00</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">Method</span>
                    <span className="font-medium text-slate-700">Klarna Pay later</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-[15px] font-semibold text-slate-800 mb-4">Warehouse Routing</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Location</span>
                    <span className="font-medium text-slate-800">DE-INVENTORY-7020</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">WMS ID</span>
                    <span className="font-mono text-slate-600">FO-4980</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">Properties</span>
                    <span className="font-medium text-slate-600">isWarehouse, GWP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 2: Order Items */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-[15px] font-semibold text-slate-800 mb-4">Order Items</h2>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-3 font-medium">SKU</th>
                    <th className="pb-3 font-medium">Product Name</th>
                    <th className="pb-3 font-medium text-center">Qty</th>
                    <th className="pb-3 font-medium text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 font-mono text-xs text-blue-600">TSHIRT-BIO-WHT</td>
                    <td className="py-3 font-medium text-slate-700">T-Shirt aus Bio-Baumwolle (Monogramm)</td>
                    <td className="py-3 text-center text-slate-600">1</td>
                    <td className="py-3 text-right text-slate-800">€201.68</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-mono text-xs text-blue-600">SHIP-NORMAL</td>
                    <td className="py-3 font-medium text-slate-700">Standard Shipping</td>
                    <td className="py-3 text-center text-slate-600">1</td>
                    <td className="py-3 text-right text-slate-800">€0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ROW 3: Shipment Details & Tracking */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-800">Shipment Details</h2>
                  <p className="text-sm text-slate-500 mt-1">SP-3888 • 1 Carton</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">DHL Tracking</p>
                  <a href="#" className="font-mono font-medium text-blue-600 hover:text-blue-800 text-base">
                    {trackingNumber}
                  </a>
                </div>
              </div>
              <ParcelsAppWidget trackingNumber={trackingNumber} />
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            
            {/* Exceptions Component */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-[15px] font-semibold text-slate-800 mb-4">Order Investigation</h2>
              
              <div className="space-y-4">
                {/* Exception 1 */}
                <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-slate-800 text-sm">Payment Collection</span>
                    <div className="text-right">
                      <span className="font-semibold text-slate-800 text-sm">2d 14h</span>
                      <p className="text-xs text-slate-500">4/7/2026</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium text-slate-700">Failed Capture</span>
                  </div>
                  <p className="text-sm text-red-600 font-medium mb-4">Reason: Klarna Gateway Rejected</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">Acknowledged</span>
                    <div className="space-x-2">
                      <button className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1.5 rounded hover:bg-slate-200">Assign</button>
                      <button className="text-xs font-medium bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 shadow-sm">Resolve</button>
                    </div>
                  </div>
                </div>

                {/* Exception 2 */}
                <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-slate-800 text-sm">Active Return</span>
                    <div className="text-right">
                      <span className="font-semibold text-slate-800 text-sm">RO-0382</span>
                      <p className="text-xs text-slate-500">4/10/2026</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium text-slate-700">Return Processing</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">Reason: Customer initiated return</p>
                  
                  <div className="flex justify-end space-x-2">
                    <button className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1.5 rounded hover:bg-slate-200">Comment</button>
                    <button className="text-xs font-medium bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 shadow-sm">Process</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Simple Timeline */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-[15px] font-semibold text-slate-800 mb-4">Event History</h2>
              <div className="relative pl-4 space-y-6 border-l-2 border-slate-100 ml-2">
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-white"></div>
                  <p className="text-sm font-medium text-slate-800">Return Created</p>
                  <p className="text-xs text-slate-500">Apr 10, 08:17 AM</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white"></div>
                  <p className="text-sm font-medium text-red-600">Payment Error</p>
                  <p className="text-xs text-slate-500">Apr 7, 08:36 AM</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white"></div>
                  <p className="text-sm font-medium text-slate-800">Shipped (SP-3888)</p>
                  <p className="text-xs text-slate-500">Apr 7, 08:35 AM</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingPage;
