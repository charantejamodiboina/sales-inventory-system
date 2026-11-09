import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { CheckSquare, XCircle, CheckCircle2, AlertTriangle, Eye, ShieldCheck, Clock } from 'lucide-react';
import { StatusBadge } from '../components/UI/Badge';
import { Modal } from '../components/UI/Modal';

export function Approvals({ onApprovalProcessed }) {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [decisionModal, setDecisionModal] = useState(null); // { order, action: 'APPROVED' | 'REJECTED' }
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // View order detail state
  const [viewOrderId, setViewOrderId] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setLoading(true);
    try {
      const data = await api.get('/approvals/pending');
      setPendingOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDecision = (order, action) => {
    setError('');
    setComments('');
    setDecisionModal({ order, action });
  };

  const handleConfirmDecision = async () => {
    if (!decisionModal) return;
    setProcessing(true);
    setError('');
    try {
      const payload = {
        action: decisionModal.action,
        comments: comments.trim() || undefined,
      };
      await api.post(`/approvals/${decisionModal.order.id}/decide`, payload);
      setSuccessMsg(
        `Order ${decisionModal.order.order_number} was successfully ${
          decisionModal.action === 'APPROVED' ? 'APPROVED & Completed' : 'REJECTED'
        }.`
      );
      setDecisionModal(null);
      loadPending();
      if (onApprovalProcessed) onApprovalProcessed();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleInspectOrder = async (orderId) => {
    setViewOrderId(orderId);
    try {
      const detail = await api.get(`/orders/${orderId}`);
      setOrderDetail(detail);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">High-Value Order Approval Queue</h2>
          <p className="text-xs text-slate-500 mt-1">
            Orders exceeding the configured threshold require explicit management sign-off before inventory deduction and fulfillment.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold shrink-0">
          <Clock className="w-4 h-4 text-amber-600" />
          <span>{pendingOrders.length} Order{pendingOrders.length !== 1 ? 's' : ''} Pending Review</span>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 text-xs">Dismiss</button>
        </div>
      )}

      {/* Orders List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading pending approval queue...</div>
        ) : pendingOrders.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <div className="font-semibold text-slate-700 text-base">All caught up!</div>
            <div className="text-xs text-slate-400 mt-1">No sales orders currently require manager approval.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Order Number</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Sales Rep</th>
                  <th className="py-3.5 px-4 text-right">Order Amount</th>
                  <th className="py-3.5 px-4">Submission Date</th>
                  <th className="py-3.5 px-4 text-center">Manager Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-amber-50/30">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 flex items-center gap-2">
                      <span>{o.order_number}</span>
                      <button
                        onClick={() => handleInspectOrder(o.id)}
                        className="p-1 text-slate-400 hover:text-indigo-600"
                        title="Quick View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">{o.customer_name}</td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs">{o.created_by_username}</td>
                    <td className="py-3.5 px-4 text-right font-black text-indigo-700 text-base">
                      ₹{o.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenDecision(o, 'APPROVED')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleOpenDecision(o, 'REJECTED')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decision Confirmation Modal */}
      <Modal
        isOpen={!!decisionModal}
        onClose={() => setDecisionModal(null)}
        title={decisionModal?.action === 'APPROVED' ? 'Approve Sales Order' : 'Reject Sales Order'}
        maxWidth="max-w-md"
      >
        {decisionModal && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border text-xs ${
              decisionModal.action === 'APPROVED'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="font-bold text-sm mb-1">
                {decisionModal.action === 'APPROVED' ? 'Order Approval Impact:' : 'Order Rejection Notice:'}
              </div>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Order: <span className="font-mono font-bold">{decisionModal.order.order_number}</span></li>
                <li>Amount: <span className="font-bold">₹{decisionModal.order.total_amount.toLocaleString('en-IN')}</span></li>
                {decisionModal.action === 'APPROVED' ? (
                  <>
                    <li>Inventory will be safely deducted in an atomic transaction.</li>
                    <li>Order status will transition to <span className="font-bold">COMPLETED</span>.</li>
                    <li>Sales representative will receive confirmation email.</li>
                  </>
                ) : (
                  <>
                    <li>Inventory remains unchanged (no stock reduction).</li>
                    <li>Order status will transition to <span className="font-bold">REJECTED</span>.</li>
                    <li>Sales representative will be notified of rejection reason.</li>
                  </>
                )}
              </ul>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Manager Comments / Decision Reason
              </label>
              <textarea
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={decisionModal.action === 'APPROVED' ? 'e.g. Approved. Customer credit approved.' : 'e.g. Rejection reason: Out of scope or budget constraints.'}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDecisionModal(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handleConfirmDecision}
                className={`px-5 py-2 rounded-lg text-xs font-bold text-white shadow-sm transition-colors disabled:opacity-50 ${
                  decisionModal.action === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {processing ? 'Processing Transaction...' : `Confirm ${decisionModal.action}`}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Quick View Modal */}
      <Modal
        isOpen={!!viewOrderId}
        onClose={() => {
          setViewOrderId(null);
          setOrderDetail(null);
        }}
        title={`Review Order Items: ${orderDetail?.order_number || ''}`}
        maxWidth="max-w-2xl"
      >
        {orderDetail && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between">
              <div>
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold ml-1">{orderDetail.customer_name}</span>
              </div>
              <div>
                <span className="text-slate-500">Total:</span>
                <span className="font-bold text-indigo-600 ml-1">₹{orderDetail.total_amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <table className="w-full text-left">
              <thead className="bg-slate-100 font-semibold text-slate-600">
                <tr>
                  <th className="py-2 px-3">Item</th>
                  <th className="py-2 px-3 text-center">Qty</th>
                  <th className="py-2 px-3 text-right">Unit Price</th>
                  <th className="py-2 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orderDetail.items.map((it) => (
                  <tr key={it.id}>
                    <td className="py-2 px-3 font-medium">{it.product_name}</td>
                    <td className="py-2 px-3 text-center font-bold">{it.quantity}</td>
                    <td className="py-2 px-3 text-right">₹{it.unit_price.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3 text-right font-bold">₹{it.total_price.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}

