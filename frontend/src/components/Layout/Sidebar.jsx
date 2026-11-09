import React from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
  Warehouse,
  ShoppingCart,
  CheckSquare,
  History,
  Settings,
  Mail,
  UserCheck,
  PlusCircle,
  FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { RoleBadge } from '../UI/Badge';

export function Sidebar({ currentView, setCurrentView, pendingApprovalsCount = 0, lowStockCount = 0 }) {
  const { user, isAdmin, isManager, isSalesUser } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'SALES_USER'] },
    { id: 'create-order', label: 'Create Order', icon: PlusCircle, roles: ['SALES_USER', 'ADMIN'] },
    { id: 'orders', label: isSalesUser ? 'My Orders' : 'All Orders', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'SALES_USER'] },
    { id: 'approvals', label: 'Pending Approvals', icon: CheckSquare, badge: pendingApprovalsCount, roles: ['ADMIN', 'MANAGER'] },
    { id: 'approval-history', label: 'Approval History', icon: History, roles: ['ADMIN', 'MANAGER'] },
    { id: 'inventory', label: 'Inventory', icon: Warehouse, badge: lowStockCount, badgeColor: 'bg-amber-100 text-amber-800', roles: ['ADMIN', 'MANAGER', 'SALES_USER'] },
    { id: 'products', label: 'Products', icon: Package, roles: ['ADMIN', 'MANAGER', 'SALES_USER'] },
    { id: 'customers', label: 'Customers', icon: Users, roles: ['ADMIN', 'MANAGER', 'SALES_USER'] },
    { id: 'users', label: 'User Management', icon: UserCheck, roles: ['ADMIN'] },
    { id: 'settings', label: 'Approval Config', icon: Settings, roles: ['ADMIN'] },
    { id: 'email-logs', label: 'Email Notifications', icon: Mail, roles: ['ADMIN', 'MANAGER'] },
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(user?.role));

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
          AT
        </div>
        <div>
          <div className="font-bold text-white text-base tracking-tight leading-none">ApexTrack</div>
          <div className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider font-medium">Sales & Inventory</div>
        </div>
      </div>

      {/* User Mini Card */}
      <div className="px-4 py-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="text-xs text-slate-400">Signed in as</div>
        <div className="text-sm font-semibold text-white truncate mt-0.5">{user?.full_name}</div>
        <div className="mt-2">
          <RoleBadge role={user?.role} />
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Main Navigation
        </div>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    item.badgeColor || 'bg-amber-400 text-slate-950'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Footer */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
        <span>Demo Build v1.0</span>
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Connected"></span>
      </div>
    </aside>
  );
}

