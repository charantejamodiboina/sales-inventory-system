import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Eye, Search, Filter, ShoppingCart, Calendar, User, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { StatusBadge } from '../components/UI/Badge';
import { Modal } from '../components/UI/Modal';
import { useAuth } from '../contexts/AuthContext';

export function Orders({ myOrdersOnly = false }) {
  const { isManager } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      let endpoint = `/orders?my_orders_only=${myOrdersOnly}`;
      if (statusFilter) endpoint += `&status=${statusFilter}`;
      const data = await api.get(endpoint);
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = async (orderId) => {
    setSelectedOrder(orderId);
    setLoadingDetail(true);
    try {
      const detail = await api.get(`/orders/${orderId}`);
      setOrderDetail(detail);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
      (o.created_by_username && o.created_by_username.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search order #, customer, rep..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Filter className="w-4 h-4 text-slate-400" /> Filter:
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg font-medium text-slate-700 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading orders from database...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No sales orders found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Order Number</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Sales Rep</th>
                  <th className="py-3.5 px-4 text-right">Total Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{o.order_number}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">{o.customer_name}</td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs">{o.created_by_username}</td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900">
                      ₹{o.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(o.created_at).toLocaleDateString()} {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleViewOrder(o.id)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Order Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => {
          setSelectedOrder(null);
          setOrderDetail(null);
        }}
        title={`Sales Order Details: ${orderDetail?.order_number || ''}`}
        maxWidth="max-w-3xl"
      >
        {loadingDetail || !orderDetail ? (
          <div className="text-center py-8 text-slate-500">Loading order items and history...</div>
        ) : (
          <div className="space-y-6">
            {/* Header Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Customer:</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{orderDetail.customer_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Status:</span>
                <div className="mt-1"><StatusBadge status={orderDetail.status} /></div>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Created By:</span>
                <span className="font-semibold text-slate-700 text-sm mt-0.5 block">{orderDetail.created_by_username}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Total Amount:</span>
                <span className="font-black text-indigo-600 text-base mt-0.5 block">
                  ₹{orderDetail.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Ordered Products</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Item</th>
                      <th className="py-2.5 px-4">SKU</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Unit Price</th>
                      <th className="py-2.5 px-4 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orderDetail.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">{it.product_name}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-500">{it.product_sku}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-slate-900">{it.quantity}</td>
                        <td className="py-2.5 px-4 text-right text-slate-600">₹{it.unit_price.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">₹{it.total_price.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs max-w-xs ml-auto">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold">₹{orderDetail.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Discount:</span>
                <span>-₹{orderDetail.discount_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax:</span>
                <span>+₹{orderDetail.tax_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-sm text-slate-900">
                <span>Total:</span>
                <span className="text-indigo-600">₹{orderDetail.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Approval Audit Timeline */}
            {orderDetail.approval_history?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Manager Approval Timeline</h4>
                <div className="space-y-2">
                  {orderDetail.approval_history.map((h) => (
                    <div key={h.id} className="p-3 rounded-lg border border-slate-200 bg-white text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          Decided by {h.decided_by_username}: <span className={h.action === 'APPROVED' ? 'text-emerald-600' : 'text-rose-600'}>{h.action}</span>
                        </span>
                        <span className="text-slate-400">{new Date(h.created_at).toLocaleString()}</span>
                      </div>
                      {h.comments && <p className="text-slate-600 italic">"{h.comments}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

