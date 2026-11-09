import React from 'react';
import { LogOut, Bell, Shield, UserCheck, Briefcase, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { RoleBadge } from '../UI/Badge';

export function TopNavbar({ currentView, pendingApprovalsCount = 0, lowStockCount = 0, onRefresh, refreshing }) {
  const { user, logout, switchDemoUser } = useAuth();

  const titles = {
    dashboard: 'Executive Dashboard',
    'create-order': 'New Sales Order',
    orders: 'Sales Orders',
    approvals: 'Manager Approval Queue',
    'approval-history': 'Order Approval Audit Trail',
    inventory: 'Inventory & Stock Movements',
    products: 'Product Catalog',
    customers: 'Customer Accounts',
    users: 'System Users',
    settings: 'System Configuration',
    'email-logs': 'SMTP Email Notification Logs',
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-sm">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{titles[currentView] || 'Management Portal'}</h1>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          title="Refresh real-time data"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
        </button>
      </div>

      <div className="flex items-center gap-5">
        {/* Quick Demo Role Switcher */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
          <span className="text-slate-400 mr-1">Demo Role Switch:</span>
          <button
            onClick={() => switchDemoUser('SALES_USER')}
            className={`px-2 py-1 rounded transition-colors ${
              user?.role === 'SALES_USER' ? 'bg-white text-sky-700 shadow-sm font-semibold' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            Sales User
          </button>
          <button
            onClick={() => switchDemoUser('MANAGER')}
            className={`px-2 py-1 rounded transition-colors ${
              user?.role === 'MANAGER' ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            Manager
          </button>
          <button
            onClick={() => switchDemoUser('ADMIN')}
            className={`px-2 py-1 rounded transition-colors ${
              user?.role === 'ADMIN' ? 'bg-white text-purple-700 shadow-sm font-semibold' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            Admin
          </button>
        </div>

        {/* Alerts Pill */}
        {(pendingApprovalsCount > 0 || lowStockCount > 0) && (
          <div className="flex items-center gap-2">
            {pendingApprovalsCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                {pendingApprovalsCount} Approvals Pending
              </span>
            )}
            {lowStockCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                {lowStockCount} Low Stock
              </span>
            )}
          </div>
        )}

        {/* User Info & Logout */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold text-slate-800 leading-tight">{user?.username}</div>
            <div className="text-[11px] text-slate-400 capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

