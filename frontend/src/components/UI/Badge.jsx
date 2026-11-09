import React from 'react';

export function StatusBadge({ status }) {
  const configs = {
    COMPLETED: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Completed' },
    PENDING_APPROVAL: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Pending Approval' },
    APPROVED: { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Approved' },
    REJECTED: { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Rejected' },
    DRAFT: { bg: 'bg-slate-50 text-slate-700 border-slate-200', label: 'Draft' },
    CANCELLED: { bg: 'bg-zinc-100 text-zinc-600 border-zinc-200', label: 'Cancelled' },
  };

  const config = configs[status] || { bg: 'bg-slate-100 text-slate-700 border-slate-200', label: status };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg}`}>
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-75"></span>
      {config.label}
    </span>
  );
}

export function RoleBadge({ role }) {
  const configs = {
    ADMIN: { bg: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Administrator' },
    MANAGER: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Manager' },
    SALES_USER: { bg: 'bg-sky-50 text-sky-700 border-sky-200', label: 'Sales User' },
  };

  const config = configs[role] || { bg: 'bg-slate-50 text-slate-700 border-slate-200', label: role };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.bg}`}>
      {config.label}
    </span>
  );
}

export function StockBadge({ currentStock, threshold = 10 }) {
  if (currentStock <= 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
        Out of Stock
      </span>
    );
  }
  if (currentStock <= threshold) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
        Low Stock ({currentStock})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      {currentStock} in stock
    </span>
  );
}

