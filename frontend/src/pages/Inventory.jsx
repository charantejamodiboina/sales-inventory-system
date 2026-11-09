import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Warehouse, PlusCircle, Sliders, History, Search, AlertTriangle, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { StockBadge } from '../components/UI/Badge';
import { Modal } from '../components/UI/Modal';
import { useAuth } from '../contexts/AuthContext';

export function Inventory() {
  const { isManager } = useAuth();
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' or 'transactions'
  const [stockList, setStockList] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Restock Modal State
  const [restockModal, setRestockModal] = useState(null); // selected product
  const [restockQty, setRestockQty] = useState(10);
  const [restockNotes, setRestockNotes] = useState('');
  const [submittingRestock, setSubmittingRestock] = useState(false);

  // Adjust Modal State
  const [adjustModal, setAdjustModal] = useState(null); // selected product
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustNotes, setAdjustNotes] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadData();
  }, [lowStockFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const endpoint = lowStockFilter ? '/inventory/stock?is_low_stock=true' : '/inventory/stock';
      const [stocks, txs] = await Promise.all([
        api.get(endpoint),
        api.get('/inventory/transactions?limit=100')
      ]);
      setStockList(stocks);
      setTransactions(txs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockModal) return;
    setError('');
    setSubmittingRestock(true);
    try {
      await api.post('/inventory/restock', {
        product_id: restockModal.id,
        quantity: parseInt(restockQty),
        notes: restockNotes.trim() || undefined,
      });
      setSuccessMsg(`Successfully restocked ${restockQty} units of '${restockModal.name}'.`);
      setRestockModal(null);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingRestock(false);
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustModal) return;
    setError('');
    setSubmittingAdjust(true);
    try {
      await api.post(`/inventory/adjust/${adjustModal.id}`, {
        quantity_change: parseInt(adjustQty),
        notes: adjustNotes.trim() || undefined,
      });
      setSuccessMsg(`Stock reconciled for '${adjustModal.name}'.`);
      setAdjustModal(null);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingAdjust(false);
    }
  };

  const filteredStock = stockList.filter((p) => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      {/* Tab Switcher & Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'stock'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Current Stock Levels
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'transactions'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Inventory Movement Audit Log
          </button>
        </div>

        {activeTab === 'stock' && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setLowStockFilter(!lowStockFilter)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors ${
                lowStockFilter
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Low Stock Filter</span>
            </button>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search inventory..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex justify-between items-center">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700">Dismiss</button>
        </div>
      )}

      {/* Stock Tab View */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading stock inventory...</div>
          ) : filteredStock.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No inventory items found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-4 text-center">Stock Level</th>
                    <th className="py-3 px-4 text-right">Threshold</th>
                    {isManager && <th className="py-3 px-4 text-center">Stock Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStock.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-900">{p.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{p.sku}</td>
                      <td className="py-3 px-4 text-slate-600">{p.category}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        ₹{p.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StockBadge currentStock={p.current_stock} threshold={p.reorder_threshold} />
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 font-medium">{p.reorder_threshold}</td>
                      {isManager && (
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setRestockModal(p);
                                setRestockQty(10);
                                setRestockNotes('');
                              }}
                              className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded font-semibold text-[11px]"
                            >
                              Restock
                            </button>
                            <button
                              onClick={() => {
                                setAdjustModal(p);
                                setAdjustQty(0);
                                setAdjustNotes('');
                              }}
                              className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded font-semibold text-[11px]"
                            >
                              Reconcile
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Audit Log Tab View */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Transaction Type</th>
                  <th className="py-3 px-4 text-right">Quantity Change</th>
                  <th className="py-3 px-4 text-right">Prev &rarr; New Stock</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => {
                  const isDeduction = tx.quantity_change < 0;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{tx.product_name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{tx.product_sku}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.change_type === 'ORDER_DEDUCTION'
                            ? 'bg-amber-100 text-amber-800'
                            : tx.change_type === 'RESTOCK'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {tx.change_type}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${isDeduction ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {tx.quantity_change > 0 ? `+${tx.quantity_change}` : tx.quantity_change}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-600">
                        {tx.previous_stock} &rarr; <span className="font-bold text-slate-900">{tx.new_stock}</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">{tx.performed_by_username}</td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={tx.notes}>
                        {tx.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      <Modal
        isOpen={!!restockModal}
        onClose={() => setRestockModal(null)}
        title={`Restock Product: ${restockModal?.name || ''}`}
        maxWidth="max-w-md"
      >
        {restockModal && (
          <form onSubmit={handleRestockSubmit} className="space-y-4 text-xs">
            {error && <div className="p-2.5 bg-red-50 text-red-700 rounded font-semibold">{error}</div>}
            <div>
              <span className="text-slate-500">Current Stock: </span>
              <span className="font-bold text-slate-900">{restockModal.current_stock}</span>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Quantity to Add (Restock) *</label>
              <input
                type="number"
                min="1"
                required
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Restock Notes / Vendor PO</label>
              <input
                type="text"
                value={restockNotes}
                onChange={(e) => setRestockNotes(e.target.value)}
                placeholder="e.g. Shipment batch #902"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRestockModal(null)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingRestock}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg"
              >
                {submittingRestock ? 'Restocking...' : 'Add Stock'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Adjust Modal */}
      <Modal
        isOpen={!!adjustModal}
        onClose={() => setAdjustModal(null)}
        title={`Reconcile Inventory: ${adjustModal?.name || ''}`}
        maxWidth="max-w-md"
      >
        {adjustModal && (
          <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
            {error && <div className="p-2.5 bg-red-50 text-red-700 rounded font-semibold">{error}</div>}
            <div className="p-3 bg-slate-50 rounded border text-slate-600">
              Current recorded inventory: <span className="font-bold text-slate-900">{adjustModal.current_stock}</span>.
              Enter positive number to increment, or negative number to reduce.
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Stock Adjustment (+/-) *</label>
              <input
                type="number"
                required
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <div className="text-[11px] text-slate-500 mt-1">
                New stock will be: <span className="font-bold">{adjustModal.current_stock + (parseInt(adjustQty) || 0)}</span>
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Adjustment Reason *</label>
              <input
                type="text"
                required
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="e.g. Damaged during handling, physical audit discrepancy"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustModal(null)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAdjust}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg"
              >
                {submittingAdjust ? 'Applying...' : 'Apply Adjustment'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

