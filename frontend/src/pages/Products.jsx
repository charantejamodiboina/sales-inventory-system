import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle } from 'lucide-react';
import { StockBadge } from '../components/UI/Badge';
import { Modal } from '../components/UI/Modal';
import { useAuth } from '../contexts/AuthContext';

export function Products() {
  const { isManager } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Form Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: 'General',
    unit_price: 1000,
    cost_price: 600,
    current_stock: 10,
    reorder_threshold: 5,
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await api.get('/products');
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      description: '',
      category: 'General',
      unit_price: 1000,
      cost_price: 600,
      current_stock: 10,
      reorder_threshold: 5,
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setFormData({
      sku: p.sku,
      name: p.name,
      description: p.description || '',
      category: p.category,
      unit_price: p.unit_price,
      cost_price: p.cost_price,
      current_stock: p.current_stock,
      reorder_threshold: p.reorder_threshold,
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      if (editingProduct) {
        // Update product
        await api.put(`/products/${editingProduct.id}`, {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          unit_price: parseFloat(formData.unit_price),
          cost_price: parseFloat(formData.cost_price),
          reorder_threshold: parseInt(formData.reorder_threshold),
        });
        setSuccessMsg(`Updated product '${formData.name}'.`);
      } else {
        // Create product
        await api.post('/products', {
          sku: formData.sku,
          name: formData.name,
          description: formData.description,
          category: formData.category,
          unit_price: parseFloat(formData.unit_price),
          cost_price: parseFloat(formData.cost_price),
          current_stock: parseInt(formData.current_stock),
          reorder_threshold: parseInt(formData.reorder_threshold),
          is_active: true,
        });
        setSuccessMsg(`Added new product '${formData.name}'.`);
      }
      setModalOpen(false);
      loadProducts();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Are you sure you want to delete or deactivate product '${p.name}'?`)) return;
    try {
      const res = await api.delete(`/products/${p.id}`);
      setSuccessMsg(res.message);
      loadProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    const matchCategory = !categoryFilter || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-5">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search products by name, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-medium text-slate-700 bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {isManager && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex justify-between items-center">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700">Dismiss</button>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading product catalog...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No products found matching filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-right">Cost Price</th>
                  <th className="py-3 px-4 text-center">Stock</th>
                  {isManager && <th className="py-3 px-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.sku}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      {p.description && <div className="text-slate-400 text-[11px] truncate max-w-xs">{p.description}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{p.category}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      ₹{p.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 font-medium">
                      ₹{p.cost_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StockBadge currentStock={p.current_stock} threshold={p.reorder_threshold} />
                    </td>
                    {isManager && (
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? `Edit Product: ${editingProduct.sku}` : 'Add New Product'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded font-semibold">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">SKU (Unique Identifier) *</label>
              <input
                type="text"
                required
                disabled={!!editingProduct}
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. PROD-NET-001"
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category *</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Hardware, Accessories"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Gigabit Managed Switch 24-Port"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed technical specifications..."
              className="w-full px-3 py-2 border rounded-lg text-sm"
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Selling Price (INR ₹) *</label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cost Price (INR ₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {editingProduct ? 'Current Stock Level (Read-Only)' : 'Initial Stock Quantity *'}
              </label>
              <input
                type="number"
                min="0"
                disabled={!!editingProduct}
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Low-Stock Alert Threshold *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.reorder_threshold}
                onChange={(e) => setFormData({ ...formData, reorder_threshold: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border rounded-lg text-slate-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

