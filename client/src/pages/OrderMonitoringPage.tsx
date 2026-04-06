import React, { useState, useEffect, useCallback } from 'react';
import { Order, OrderListResponse, OrderTimelineEvent, TimelineEventStatus } from '../types';
import { apiClient } from '../lib/apiClient';

// ─── Status Config ────────────────────────────────────────────────────────

const FULFILLMENT_COLORS: Record<string, string> = {
  PENDING:    'bg-slate-600 text-slate-200',
  PROCESSING: 'bg-blue-600 text-blue-100',
  PICKING:    'bg-indigo-600 text-indigo-100',
  PACKING:    'bg-violet-600 text-violet-100',
  FULFILLED:  'bg-emerald-600 text-emerald-100',
  SHIPPED:    'bg-cyan-600 text-cyan-100',
  CANCELLED:  'bg-red-700 text-red-100',
};

const SHIPMENT_COLORS: Record<string, string> = {
  PENDING:    'bg-slate-600 text-slate-200',
  SHIPPED:    'bg-cyan-600 text-cyan-100',
  IN_TRANSIT: 'bg-blue-600 text-blue-100',
  DELIVERED:  'bg-emerald-600 text-emerald-100',
  RETURNED:   'bg-orange-600 text-orange-100',
};

const PAYMENT_COLORS: Record<string, string> = {
  PAID:     'bg-emerald-600 text-emerald-100',
  PENDING:  'bg-amber-600 text-amber-100',
  FAILED:   'bg-red-600 text-red-100',
  REFUNDED: 'bg-purple-600 text-purple-100',
};

const TIMELINE_ICONS: Record<TimelineEventStatus, string> = {
  done:        '✓',
  in_progress: '⟳',
  pending:     '○',
  upcoming:    '·',
  failed:      '✕',
};

const TIMELINE_COLORS: Record<TimelineEventStatus, string> = {
  done:        'text-emerald-400 border-emerald-400 bg-emerald-400/10',
  in_progress: 'text-blue-400 border-blue-400 bg-blue-400/10 animate-pulse',
  pending:     'text-amber-400 border-amber-400 bg-amber-400/10',
  upcoming:    'text-slate-500 border-slate-600 bg-slate-700/20',
  failed:      'text-red-400 border-red-400 bg-red-400/10',
};

// ─── Sub-Components ───────────────────────────────────────────────────────

const Badge: React.FC<{ label: string; colorClass: string }> = ({ label, colorClass }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide ${colorClass}`}>
    {label}
  </span>
);

const TimelineStep: React.FC<{ event: OrderTimelineEvent; isLast: boolean }> = ({ event, isLast }) => {
  const colors = TIMELINE_COLORS[event.status];
  const icon = TIMELINE_ICONS[event.status];

  return (
    <div className="flex gap-4">
      {/* Icon + vertical line */}
      <div className="flex flex-col items-center">
        <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold ${colors}`}>
          {icon}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-slate-700 mt-1" />}
      </div>
      {/* Content */}
      <div className={`pb-6 ${isLast ? '' : ''}`}>
        <p className={`font-semibold text-sm ${event.status === 'upcoming' ? 'text-slate-500' : 'text-slate-200'}`}>
          {event.label}
        </p>
        {event.timestamp && (
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date(event.timestamp).toLocaleString()}
          </p>
        )}
        {event.detail && (
          <p className="text-xs text-slate-400 mt-1 italic">{event.detail}</p>
        )}
      </div>
    </div>
  );
};

const OrderTimeline: React.FC<{ events: OrderTimelineEvent[] }> = ({ events }) => (
  <div className="mt-2">
    {events.map((ev, i) => (
      <TimelineStep key={i} event={ev} isLast={i === events.length - 1} />
    ))}
  </div>
);

const StatCard: React.FC<{ label: string; value: number | string; icon: string; color: string }> = ({
  label, value, icon, color,
}) => (
  <div className={`rounded-xl p-4 border border-slate-700/50 bg-slate-800/60 backdrop-blur flex items-center gap-3`}>
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${color}`}>{icon}</div>
    <div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────

type ViewMode = 'table' | 'timeline';

const OrderMonitoringPage: React.FC = () => {
  const [data, setData] = useState<OrderListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filters, setFilters] = useState({
    site_id: '',
    fulfillment_status: '',
    shipment_status: '',
    search: '',
    date_from: '',
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (filters.site_id) params.set('site_id', filters.site_id);
      if (filters.fulfillment_status) params.set('fulfillment_status', filters.fulfillment_status);
      if (filters.shipment_status) params.set('shipment_status', filters.shipment_status);
      if (filters.date_from) params.set('date_from', filters.date_from);

      const json: OrderListResponse = await apiClient.get(`/orders?${params}`);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  const fetchOrderDetail = useCallback(async (orderNo: string) => {
    try {
      const order: Order = await apiClient.get(`/orders/${encodeURIComponent(orderNo)}`);
      setSelectedOrder(order);
    } catch (e) {
      console.error('Failed to fetch order detail:', e);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleRefresh = () => { setRefreshing(true); fetchOrders(); };

  const filteredOrders = (data?.orders || []).filter(o => {
    if (!filters.search) return true;
    const search = filters.search.toLowerCase();
    return (
      o.order_no.toLowerCase().includes(search) ||
      (o.customer_email || '').toLowerCase().includes(search) ||
      (o.tracking_number || '').toLowerCase().includes(search) ||
      o.site_id.toLowerCase().includes(search)
    );
  });

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading order data…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center bg-red-900/20 border border-red-500/30 rounded-xl p-8">
          <p className="text-red-400 text-lg mb-2">⚠ {error}</p>
          <button onClick={handleRefresh} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Order Monitoring
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              End-to-end fulfillment tracking across all 39 MCM sites
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                ☰ Table
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'timeline' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                ◎ Timeline
              </button>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm transition-all"
            >
              <span className={refreshing ? 'animate-spin' : ''}>⟳</span> Refresh
            </button>
          </div>
        </div>

        {/* ─── Stats Row ──────────────────────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <StatCard label="Total Orders" value={stats.total} icon="📦" color="bg-blue-500/20 text-blue-300" />
            <StatCard label="Delivered" value={stats.byShipmentStatus['DELIVERED'] || 0} icon="✓" color="bg-emerald-500/20 text-emerald-300" />
            <StatCard label="In Transit" value={stats.byShipmentStatus['SHIPPED'] || stats.byShipmentStatus['IN_TRANSIT'] || 0} icon="🚚" color="bg-cyan-500/20 text-cyan-300" />
            <StatCard label="Exceptions" value={stats.exceptions} icon="⚠" color="bg-red-500/20 text-red-300" />
          </div>
        )}
      </div>

      {/* ─── Filters ────────────────────────────────────────────────────── */}
      <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-slate-400 mb-1 block">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              placeholder="Order #, email, tracking…"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Fulfillment</label>
            <select
              value={filters.fulfillment_status}
              onChange={e => setFilters(f => ({ ...f, fulfillment_status: e.target.value }))}
              className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All</option>
              {['PENDING', 'PROCESSING', 'PICKING', 'PACKING', 'FULFILLED', 'SHIPPED', 'CANCELLED'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Shipment</label>
            <select
              value={filters.shipment_status}
              onChange={e => setFilters(f => ({ ...f, shipment_status: e.target.value }))}
              className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All</option>
              {['PENDING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Site ID</label>
            <input
              type="text"
              value={filters.site_id}
              onChange={e => setFilters(f => ({ ...f, site_id: e.target.value }))}
              placeholder="e.g. uk"
              className="w-28 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          {(filters.fulfillment_status || filters.shipment_status || filters.search || filters.site_id) && (
            <button
              onClick={() => setFilters({ site_id: '', fulfillment_status: '', shipment_status: '', search: '', date_from: '' })}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 transition-all"
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* ─── Two-panel layout: List + Detail ───────────────────────────── */}
      <div className="flex gap-6">
        {/* LEFT: Order List */}
        <div className={`${selectedOrder ? 'w-1/2 2xl:w-3/5' : 'w-full'} transition-all duration-300`}>
          {viewMode === 'table' ? (
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="text-left px-4 py-3">Order #</th>
                      <th className="text-left px-4 py-3">Site</th>
                      <th className="text-left px-4 py-3">Payment</th>
                      <th className="text-left px-4 py-3">Picking</th>
                      <th className="text-left px-4 py-3">Packing</th>
                      <th className="text-left px-4 py-3">Shipment</th>
                      <th className="text-left px-4 py-3">Tracking</th>
                      <th className="text-left px-4 py-3">Flags</th>
                      <th className="text-left px-4 py-3">Last Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-slate-500">
                          No orders found
                        </td>
                      </tr>
                    ) : filteredOrders.map(order => (
                      <tr
                        key={`${order.order_no}-${order.source_system}`}
                        onClick={() => fetchOrderDetail(order.order_no)}
                        className={`border-b border-slate-700/50 hover:bg-slate-700/40 cursor-pointer transition-colors ${
                          selectedOrder?.order_no === order.order_no ? 'bg-blue-900/20 border-l-2 border-l-blue-500' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-blue-300 text-xs">
                          {order.order_no}
                          {(order.exception_flags?.length > 0) && (
                            <span className="ml-1 text-red-400">⚠</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-1.5 py-0.5 bg-slate-700 rounded text-xs font-mono">
                            {order.site_id}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge label={order.payment_status} colorClass={PAYMENT_COLORS[order.payment_status] || 'bg-slate-600 text-slate-200'} />
                        </td>
                        <td className="px-4 py-3">
                          <Badge label={order.picking_status} colorClass={
                            order.picking_status === 'PICKED' ? 'bg-emerald-700 text-emerald-100' :
                            order.picking_status === 'IN_PICKING' ? 'bg-blue-700 text-blue-100' :
                            order.picking_status === 'FAILED' ? 'bg-red-700 text-red-100' :
                            'bg-slate-600 text-slate-300'
                          } />
                        </td>
                        <td className="px-4 py-3">
                          <Badge label={order.packing_status} colorClass={
                            order.packing_status === 'PACKED' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-600 text-slate-300'
                          } />
                        </td>
                        <td className="px-4 py-3">
                          <Badge label={order.shipment_status} colorClass={SHIPMENT_COLORS[order.shipment_status] || 'bg-slate-600 text-slate-200'} />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-300">
                          {order.tracking_number ? (
                            <span title={order.carrier || ''}>
                              {order.carrier && <span className="text-slate-500 mr-1">{order.carrier}</span>}
                              {order.tracking_number.slice(-8)}…
                            </span>
                          ) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {order.exception_flags?.length > 0 ? (
                            <span className="text-red-400 text-xs font-semibold">
                              {order.exception_flags.join(', ')}
                            </span>
                          ) : <span className="text-slate-600 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs max-w-[180px] truncate">
                          {order.last_event || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-slate-700 text-xs text-slate-500 flex justify-between">
                <span>Showing {filteredOrders.length} of {data?.stats.total || 0} orders</span>
                <span>Click a row to view fulfillment timeline</span>
              </div>
            </div>
          ) : (
            /* TIMELINE VIEW — show all orders as mini cards with stepper */
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No orders found</div>
              ) : filteredOrders.map(order => (
                <div
                  key={`${order.order_no}-${order.source_system}`}
                  onClick={() => fetchOrderDetail(order.order_no)}
                  className={`bg-slate-800/60 backdrop-blur border rounded-xl p-4 cursor-pointer hover:border-blue-500/50 transition-all ${
                    selectedOrder?.order_no === order.order_no ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-slate-700/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-mono font-bold text-blue-300">{order.order_no}</span>
                      <span className="ml-2 text-xs text-slate-400">({order.site_id})</span>
                      {order.exception_flags?.length > 0 && (
                        <span className="ml-2 text-xs text-red-400 font-semibold">⚠ {order.exception_flags.join(', ')}</span>
                      )}
                    </div>
                    <Badge label={order.fulfillment_status} colorClass={FULFILLMENT_COLORS[order.fulfillment_status] || 'bg-slate-600 text-slate-200'} />
                  </div>
                  {/* Mini horizontal stepper */}
                  <div className="flex items-center gap-1 text-xs">
                    {[
                      { label: 'Paid',    done: order.payment_status === 'PAID' },
                      { label: 'Export',  done: order.export_status === 'EXPORTED' },
                      { label: 'FO',      done: !!order.fulfillment_order_id },
                      { label: 'Pick',    done: order.picking_status === 'PICKED', active: order.picking_status === 'IN_PICKING' },
                      { label: 'Pack',    done: order.packing_status === 'PACKED' },
                      { label: 'Shipped', done: ['SHIPPED', 'IN_TRANSIT', 'DELIVERED'].includes(order.shipment_status) },
                      { label: 'Done',    done: order.shipment_status === 'DELIVERED' },
                    ].map((step, i, arr) => (
                      <React.Fragment key={step.label}>
                        <div className={`flex flex-col items-center ${step.done ? 'text-emerald-400' : step.active ? 'text-blue-400 animate-pulse' : 'text-slate-600'}`}>
                          <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                            step.done ? 'border-emerald-500 bg-emerald-500/20' :
                            step.active ? 'border-blue-500 bg-blue-500/20' :
                            'border-slate-600 bg-slate-700/30'
                          }`}>
                            {step.done ? '✓' : step.active ? '⟳' : (i + 1)}
                          </div>
                          <span className="mt-0.5 text-[9px]">{step.label}</span>
                        </div>
                        {i < arr.length - 1 && (
                          <div className={`flex-1 h-px ${step.done ? 'bg-emerald-500/50' : 'bg-slate-700'}`} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  {order.last_event && (
                    <p className="mt-2 text-xs text-slate-500 italic">{order.last_event}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Order Detail Panel */}
        {selectedOrder && (
          <div className="w-1/2 2xl:w-2/5">
            <div className="bg-slate-800/60 backdrop-blur border border-slate-700 rounded-xl p-5 sticky top-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white font-mono">{selectedOrder.order_no}</h2>
                  <p className="text-sm text-slate-400">{selectedOrder.source_system} · {selectedOrder.site_id}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-slate-500 hover:text-slate-300 text-xl font-bold transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Key facts grid */}
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                {[
                  { label: 'Payment', value: <Badge label={selectedOrder.payment_status} colorClass={PAYMENT_COLORS[selectedOrder.payment_status] || 'bg-slate-600 text-slate-200'} /> },
                  { label: 'Total', value: <span className="text-white font-semibold">{selectedOrder.currency} {selectedOrder.order_total?.toFixed(2)}</span> },
                  { label: 'Fulfillment', value: <Badge label={selectedOrder.fulfillment_status} colorClass={FULFILLMENT_COLORS[selectedOrder.fulfillment_status] || 'bg-slate-600 text-slate-200'} /> },
                  { label: 'Shipment', value: <Badge label={selectedOrder.shipment_status} colorClass={SHIPMENT_COLORS[selectedOrder.shipment_status] || 'bg-slate-600 text-slate-200'} /> },
                  { label: 'Carrier', value: <span className="text-slate-300">{selectedOrder.carrier || '—'}</span> },
                  { label: 'Tracking', value: <span className="font-mono text-blue-300">{selectedOrder.tracking_number || '—'}</span> },
                  { label: 'Location', value: <span className="text-slate-300">{selectedOrder.fulfillment_location || '—'}</span> },
                  { label: 'Customer', value: <span className="text-slate-300 truncate">{selectedOrder.customer_email || '—'}</span> },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-900/50 rounded-lg px-3 py-2">
                    <p className="text-slate-500 mb-0.5">{label}</p>
                    <div>{value}</div>
                  </div>
                ))}
              </div>

              {selectedOrder.exception_flags?.length > 0 && (
                <div className="mb-4 bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-xs font-semibold">⚠ Exceptions: {selectedOrder.exception_flags.join(', ')}</p>
                </div>
              )}

              {/* Timeline */}
              <div className="border-t border-slate-700 pt-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Fulfillment Timeline</h3>
                {selectedOrder.timeline && selectedOrder.timeline.length > 0 ? (
                  <OrderTimeline events={selectedOrder.timeline} />
                ) : (
                  <p className="text-slate-500 text-xs text-center py-4">Timeline data not yet available</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderMonitoringPage;
