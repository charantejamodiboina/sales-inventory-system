import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { api } from './api/client';
import { Sidebar } from './components/Layout/Sidebar';
import { TopNavbar } from './components/Layout/TopNavbar';
import { Toast } from './components/UI/Toast';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CreateOrder } from './pages/CreateOrder';
import { Orders } from './pages/Orders';
import { Approvals } from './pages/Approvals';
import { ApprovalHistory } from './pages/ApprovalHistory';
import { Inventory } from './pages/Inventory';
import { Products } from './pages/Products';
import { Customers } from './pages/Customers';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';
import { EmailLogs } from './pages/EmailLogs';

export function App() {
  const { isAuthenticated, loading, role, isSalesUser } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [pendingCount, setPendingCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadBadgeCounts();
      // Set reasonable default view on role login
      if (currentView === 'users' && role !== 'ADMIN') setCurrentView('dashboard');
      if (currentView === 'settings' && role !== 'ADMIN') setCurrentView('dashboard');
      if (currentView === 'approvals' && isSalesUser) setCurrentView('dashboard');
    }
  }, [isAuthenticated, role]);

  const loadBadgeCounts = async () => {
    try {
      const data = await api.get('/dashboard');
      setPendingCount(data.pending_approvals || 0);
      setLowStockCount(data.low_stock_count || 0);
    } catch (e) {
      // quiet fail for badges
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadBadgeCounts();
    setTimeout(() => setRefreshing(false), 400);
    showToast('Data refreshed successfully', 'success');
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm font-semibold tracking-wide">Starting ApexTrack Portal...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentView} />;
      case 'create-order':
        return (
          <CreateOrder
            onOrderCreated={(order) => {
              loadBadgeCounts();
              showToast(`Created order ${order.order_number}`, 'success');
            }}
          />
        );
      case 'orders':
        return <Orders myOrdersOnly={isSalesUser} />;
      case 'approvals':
        return (
          <Approvals
            onApprovalProcessed={() => {
              loadBadgeCounts();
              showToast('Approval decision recorded', 'success');
            }}
          />
        );
      case 'approval-history':
        return <ApprovalHistory />;
      case 'inventory':
        return <Inventory />;
      case 'products':
        return <Products />;
      case 'customers':
        return <Customers />;
      case 'users':
        return <Users />;
      case 'settings':
        return <Settings />;
      case 'email-logs':
        return <EmailLogs />;
      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        pendingApprovalsCount={pendingCount}
        lowStockCount={lowStockCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNavbar
          currentView={currentView}
          pendingApprovalsCount={pendingCount}
          lowStockCount={lowStockCount}
          onRefresh={handleManualRefresh}
          refreshing={refreshing}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto pb-12">{renderActiveView()}</div>
        </main>
      </div>

      {/* Global Toast Alerts */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

