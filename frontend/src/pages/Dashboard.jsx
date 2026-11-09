import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  Package,
  Users,
  DollarSign,
  ShoppingCart,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ShieldAlert
} from 'lucide-react';
import { StatusBadge, StockBadge } from '../components/UI/Badge';

export function Dashboard({ onNavigate }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await api.get('/dashboard');
      setMetrics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm font-medium">Loading live database metrics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <h3 className="font-bold text-base">Failed to load dashboard</h3>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={loadDashboard}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Total Revenue',
      value: `₹${(metrics?.total_sales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'bg-emerald-500 text-white',
      badge: 'From Completed Orders',
      badgeColor: 'text-emerald-700 bg-emerald-50',
    },
    {
      title: 'Total Orders',
      value: metrics?.total_orders || 0,
      icon: ShoppingCart,
      color: 'bg-indigo-600 text-white',
      badge: `${metrics?.completed_orders || 0} Fulfilled`,
      badgeColor: 'text-indigo-700 bg-indigo-50',
    },
    {
      title: 'Pending Approvals',
      value: metrics?.pending_approvals || 0,
      icon: Clock,
      color: 'bg-amber-500 text-white',
      badge: `Threshold: ₹${(metrics?.approval_threshold || 10000).toLocaleString('en-IN')}`,
      badgeColor: 'text-amber-700 bg-amber-50',
      action: () => onNavigate('approvals'),
    },
    {
      title: 'Low Stock Alerts',
      value: metrics?.low_stock_count || 0,
      icon: AlertTriangle,
      color: 'bg-rose-500 text-white',
      badge: 'Require Restock',
      badgeColor: 'text-rose-700 bg-rose-50',
      action: () => onNavigate('inventory'),
    },
  ];

  const secondaryKpis = [
    { title: 'Active Products', value: metrics?.total_products || 0, icon: Package, link: 'products' },
    { title: 'Registered Customers', value: metrics?.total_customers || 0, icon: Users, link: 'customers' },
    { title: 'Completed Orders', value: metrics?.completed_orders || 0, icon: CheckCircle2, link: 'orders' },
  ];

  return (
    <div className="space-y-6">
      {/* High-Value Approval Banner if pending */}
      {metrics?.pending_approvals > 0 && (
        <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-amber-900 text-sm">
                {metrics.pending_approvals} Sales Order{metrics.pending_approvals > 1 ? 's' : ''} Awaiting Manager Approval
              </div>
              <div className="text-xs text-amber-700 mt-0.5">
                Orders exceed the configured approval threshold of ₹{(metrics.approval_threshold || 10000).toLocaleString('en-IN')} and need manager confirmation.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('approvals')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors shrink-0"
          >
            Review Queue &rarr;
          </button>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              onClick={kpi.action}
              className={`bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm transition-all ${
                kpi.action ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{kpi.title}</span>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className={`px-2 py-0.5 rounded font-medium ${kpi.badgeColor}`}>{kpi.badge}</span>
                {kpi.action && <span className="text-indigo-600 font-semibold flex items-center">View &rarr;</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-3 gap-4">
        {secondaryKpis.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={i}
              onClick={() => onNavigate(item.link)}
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors text-left"
            >
              <div>
                <div className="text-xs font-medium text-slate-500">{item.title}</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{item.value}</div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <Icon className="w-4 h-4" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Charts & Order Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Overview Chart (Visual SVG/CSS bar display) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Sales Overview</h3>
              <p className="text-xs text-slate-500">Live completed orders revenue trend</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
              Live Database
            </span>
          </div>

          {metrics?.sales_overview_chart?.length > 0 ? (
            <div className="mt-4">
              <div className="h-52 flex items-end gap-3 pt-6 border-b border-slate-100 pb-2">
                {(() => {
                  const maxAmt = Math.max(...metrics.sales_overview_chart.map((d) => d.amount), 1000);
                  return metrics.sales_overview_chart.map((d, index) => {
                    const heightPercent = Math.max(12, Math.round((d.amount / maxAmt) * 100));
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                        {/* Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-900 text-white text-[11px] font-semibold py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10 shadow-lg">
                          ₹{d.amount.toLocaleString('en-IN')} ({d.order_count} orders)
                        </div>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-indigo-500 group-hover:bg-indigo-600 rounded-t-md transition-all"
                        ></div>
                        <span className="text-[10px] text-slate-400 truncate max-w-[48px]">{d.date.slice(5)}</span>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>Daily aggregated completed order volume</span>
                <span className="font-medium text-slate-600">Total: ₹{(metrics?.total_sales || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 text-sm">
              No completed sales orders recorded yet.
            </div>
          )}
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">Order Status Breakdown</h3>
            <p className="text-xs text-slate-500 mb-4">Live orders distribution</p>

            <div className="space-y-3">
              {metrics?.order_status_counts?.map((item, idx) => {
                const total = metrics.total_orders || 1;
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 capitalize">
                        {item.status.toLowerCase().replace('_', ' ')}
                      </span>
                      <span className="text-slate-500 font-medium">
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${
                          item.status === 'COMPLETED'
                            ? 'bg-emerald-500'
                            : item.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-500'
                            : item.status === 'REJECTED'
                            ? 'bg-rose-500'
                            : 'bg-slate-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onNavigate('orders')}
            className="w-full mt-6 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors"
          >
            Manage All Orders &rarr;
          </button>
        </div>
      </div>

      {/* Low Stock Watchlist & Recent Sales Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Table */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Low-Stock Watchlist</h3>
              <p className="text-xs text-slate-500">Items at or below reorder threshold</p>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Restock &rarr;
            </button>
          </div>

          {metrics?.low_stock_products?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="pb-2">Product</th>
                    <th className="pb-2">SKU</th>
                    <th className="pb-2 text-right">Available</th>
                    <th className="pb-2 text-right">Threshold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.low_stock_products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2.5 font-semibold text-slate-800 truncate max-w-[180px]">{p.name}</td>
                      <td className="py-2.5 text-slate-500 font-mono text-[11px]">{p.sku}</td>
                      <td className="py-2.5 text-right font-bold text-rose-600">{p.current_stock}</td>
                      <td className="py-2.5 text-right text-slate-400">{p.reorder_threshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              All inventory items are currently well-stocked.
            </div>
          )}
        </div>

        {/* Recent Sales Activity */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Recent Sales Activity</h3>
              <p className="text-xs text-slate-500">Latest orders submitted across sales reps</p>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View All &rarr;
            </button>
          </div>

          {metrics?.recent_sales_activity?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="pb-2">Order #</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2 text-right">Amount</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.recent_sales_activity.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="py-2.5 font-mono text-slate-900 font-medium">{o.order_number}</td>
                      <td className="py-2.5 text-slate-700 truncate max-w-[140px]">{o.customer_name}</td>
                      <td className="py-2.5 text-right font-semibold text-slate-900">
                        ₹{o.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 text-right">
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">No orders created yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

