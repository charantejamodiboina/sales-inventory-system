import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { History, CheckCircle2, XCircle, Search } from 'lucide-react';

export function ApprovalHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.get('/approvals/history');
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter((h) => {
    const q = search.toLowerCase();
    return (
      (h.order_number && h.order_number.toLowerCase().includes(q)) ||
      (h.decided_by_username && h.decided_by_username.toLowerCase().includes(q)) ||
      (h.comments && h.comments.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900">Manager Approval Audit Trail</h2>
          <p className="text-xs text-slate-500">Historical records of all approved and rejected orders</p>
        </div>
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search decision log..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading approval records...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No approval records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order Number</th>
                  <th className="py-3 px-4">Decision</th>
                  <th className="py-3 px-4">Decided By</th>
                  <th className="py-3 px-4 text-right">Order Amount</th>
                  <th className="py-3 px-4 text-right">Threshold</th>
                  <th className="py-3 px-4">Comments / Rationale</th>
                  <th className="py-3 px-4">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{item.order_number}</td>
                    <td className="py-3 px-4">
                      {item.action === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3.5 h-3.5" /> Rejected
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{item.decided_by_username}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{item.order_total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      ₹{item.threshold_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={item.comments}>
                      {item.comments || <span className="text-slate-400 italic">No comment</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

