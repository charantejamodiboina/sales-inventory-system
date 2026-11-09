import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, UserCheck, Briefcase, Lock, User, ArrowRight } from 'lucide-react';

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('sales');
  const [password, setPassword] = useState('Sales@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCreds = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black mx-auto shadow-xl shadow-indigo-500/20">
          AT
        </div>
        <h2 className="mt-4 text-3xl font-extrabold text-white tracking-tight">
          ApexTrack Enterprise
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Sales & Inventory Management System (Assessment Demo)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Username
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Seed Demo Account Shortcuts */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center mb-3">
              One-Click Seed Demo Accounts
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemoCreds('sales', 'Sales@123')}
                className="flex flex-col items-center p-2 rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 transition-colors text-center"
              >
                <Briefcase className="w-4 h-4 text-sky-600 mb-1" />
                <span className="text-[11px] font-bold text-sky-900">Sales User</span>
                <span className="text-[10px] text-sky-700">sales</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoCreds('manager', 'Manager@123')}
                className="flex flex-col items-center p-2 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors text-center"
              >
                <UserCheck className="w-4 h-4 text-indigo-600 mb-1" />
                <span className="text-[11px] font-bold text-indigo-900">Manager</span>
                <span className="text-[10px] text-indigo-700">manager</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoCreds('admin', 'Admin@123')}
                className="flex flex-col items-center p-2 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors text-center"
              >
                <ShieldCheck className="w-4 h-4 text-purple-600 mb-1" />
                <span className="text-[11px] font-bold text-purple-900">Admin</span>
                <span className="text-[10px] text-purple-700">admin</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

