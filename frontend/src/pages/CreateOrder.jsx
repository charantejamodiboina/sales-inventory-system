import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Plus, Trash2, ShoppingCart, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { StockBadge } from '../components/UI/Badge';

export function CreateOrder({ onOrderCreated }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [threshold, setThreshold] = useState(10000.0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successOrder, setSuccessOrder] = useState(null);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 1, unit_price: 0, stock: 0 }]);
  const [taxRate, setTaxRate] = useState(0.05); // 5% default
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [custData, prodData, dashData] = await Promise.all([
        api.get('/customers'),
        api.get('/products'),
        api.get('/dashboard')
      ]);
      setCustomers(custData);
      setProducts(prodData);
      if (dashData?.approval_threshold) {
        setThreshold(dashData.approval_threshold);
      }
      if (custData.length > 0) {
        setCustomerId(custData[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (index, prodId) => {
    const selectedProd = products.find((p) => p.id === parseInt(prodId));
    const newItems = [...items];
    if (selectedProd) {
      newItems[index] = {
        ...newItems[index],
        product_id: selectedProd.id,
        unit_price: selectedProd.unit_price,
        stock: selectedProd.current_stock,
      };
    } else {
      newItems[index] = { ...newItems[index], product_id: '', unit_price: 0, stock: 0 };
    }
    setItems(newItems);
  };

  const handleQuantityChange = (index, qty) => {
    const quantity = Math.max(1, parseInt(qty) || 1);
    const newItems = [...items];
    newItems[index] = { ...newItems[index], quantity };
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([...items, { product_id: '', quantity: 1, unit_price: 0, stock: 0 }]);
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Financial calculations
  const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const discount = Math.min(subtotal, Math.max(0, parseFloat(discountAmount) || 0));
  const taxable = subtotal - discount;
  const tax = taxable * (parseFloat(taxRate) || 0);
  const grandTotal = Math.round((taxable + tax) * 100) / 100;

  const requiresApproval = grandTotal > threshold;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!customerId) {
      setError('Please select a customer.');
      return;
    }

    for (const it of items) {
      if (!it.product_id) {
        setError('Please select a valid product for every item line.');
        return;
      }
      if (it.quantity > it.stock) {
        const prod = products.find((p) => p.id === it.product_id);
        setError(`Cannot order ${it.quantity} of '${prod?.name}'. Only ${it.stock} available in stock.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        customer_id: parseInt(customerId),
        items: items.map((i) => ({ product_id: parseInt(i.product_id), quantity: i.quantity })),
        tax_rate: parseFloat(taxRate),
        discount_amount: parseFloat(discount),
        notes: notes.trim() || undefined,
      };

      const result = await api.post('/orders', payload);
      setSuccessOrder(result);
      if (onOrderCreated) onOrderCreated(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSuccessOrder(null);
    setItems([{ product_id: '', quantity: 1, unit_price: 0, stock: 0 }]);
    setDiscountAmount(0);
    setNotes('');
    loadData();
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading catalog and customer database...</div>;
  }

  if (successOrder) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Sales Order Created Successfully!</h2>
        <p className="text-sm font-mono text-indigo-600 mt-1 font-semibold">{successOrder.order_number}</p>

        <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Customer:</span>
            <span className="font-semibold text-slate-900">{successOrder.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Grand Total:</span>
            <span className="font-bold text-slate-900">₹{successOrder.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Workflow Status:</span>
            <span className={`font-semibold ${successOrder.status === 'COMPLETED' ? 'text-emerald-600' : 'text-amber-600'}`}>
              {successOrder.status}
            </span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-xs">
            <span className="text-slate-500">Workflow Action:</span>
            <span className="text-slate-700">
              {successOrder.approval_required
                ? `Exceeded ₹${threshold.toLocaleString('en-IN')} threshold. Manager approval email dispatched.`
                : 'Below threshold. Auto-confirmed and inventory immediately deducted.'}
            </span>
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={resetForm}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Create Another Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Workflow Rule Context Notice */}
      <div className={`p-4 rounded-xl border flex items-center justify-between text-xs transition-colors ${requiresApproval
        ? 'bg-amber-50 border-amber-300 text-amber-900'
        : 'bg-emerald-50 border-emerald-300 text-emerald-900'
        }`}>
        <div className="flex items-center gap-3">
          {requiresApproval ? <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
          <div>
            <span className="font-bold">Workflow Rule: </span>
            <span>Configured Manager Approval Threshold is </span>
            <span className="font-bold underline">₹{threshold.toLocaleString('en-IN')}</span>.
            {requiresApproval ? (
              <span className="ml-1 text-amber-800 font-semibold">
                This order (₹{grandTotal.toLocaleString('en-IN')}) will be placed in PENDING_APPROVAL and notify managers.
              </span>
            ) : (
              <span className="ml-1 text-emerald-800 font-semibold">
                This order (₹{grandTotal.toLocaleString('en-IN')}) is below threshold and will auto-confirm & deduct stock immediately.
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {/* Customer Select */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Customer Account *
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">-- Select Customer --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.company_name ? `(${c.company_name})` : ''} - {c.email}
              </option>
            ))}
          </select>
        </div>

        {/* Multi-Item Line Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Order Line Items *
            </label>
            <button
              type="button"
              onClick={addItemRow}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              <Plus className="w-4 h-4" /> Add Line Item
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 w-32">Available Stock</th>
                  <th className="py-3 px-4 w-28">Quantity</th>
                  <th className="py-3 px-4 w-32 text-right">Unit Price</th>
                  <th className="py-3 px-4 w-36 text-right">Subtotal</th>
                  <th className="py-3 px-2 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => {
                  const lineTotal = item.unit_price * item.quantity;
                  const isStockExceeded = item.product_id && item.quantity > item.stock;

                  return (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <select
                          value={item.product_id}
                          onChange={(e) => handleProductChange(index, e.target.value)}
                          required
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">-- Choose Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} [{p.sku}] - ₹{p.unit_price.toLocaleString('en-IN')} (Stock: {p.current_stock})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        {item.product_id ? (
                          <StockBadge currentStock={item.stock} threshold={10} />
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(index, e.target.value)}
                          className={`w-full px-2.5 py-1.5 border rounded-lg text-sm ${isStockExceeded
                            ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-500'
                            : 'border-slate-200 focus:ring-indigo-500'
                            }`}
                        />
                        {isStockExceeded && (
                          <div className="text-[10px] text-red-600 font-semibold mt-0.5">Exceeds stock!</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        ₹{item.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          disabled={items.length <= 1}
                          className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Calculation Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Order Notes / Reference
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Special shipping instructions, customer PO reference..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            ></textarea>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="text-xs">Discount (₹):</span>
              <input
                type="number"
                min="0"
                step="50"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-28 text-right px-2 py-1 text-xs border border-slate-200 rounded"
              />
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="text-xs">Tax (GST Rate):</span>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value))}
                className="w-28 text-right px-2 py-1 text-xs border border-slate-200 rounded"
              >
                <option value={0.0}>0%</option>
                <option value={0.05}>5%</option>
                <option value={0.12}>12%</option>
                <option value={0.18}>18%</option>
              </select>
            </div>

            <div className="flex justify-between text-slate-600 text-xs">
              <span>Calculated Tax:</span>
              <span>₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline">
              <span className="font-bold text-slate-900 text-base">Grand Total:</span>
              <span className="font-black text-xl text-indigo-600">
                ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={submitting || items.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50"
          >
            <ShoppingCart className="w-4 h-4" />
            {submitting ? 'Validating & Processing...' : 'Submit Sales Order'}
          </button>
        </div>
      </form>
    </div>
  );
}

