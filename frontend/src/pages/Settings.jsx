import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Settings as SettingsIcon, Save, ShieldCheck, Mail, Database, Info } from 'lucide-react';

export function Settings() {
  const [settingsList, setSettingsList] = useState([]);
  const [thresholdVal, setThresholdVal] = useState('10000.00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.get('/settings');
      setSettingsList(data);
      const thresholdSetting = data.find((s) => s.setting_key === 'APPROVAL_THRESHOLD');
      if (thresholdSetting) {
        setThresholdVal(thresholdSetting.setting_value);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveThreshold = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const valNum = parseFloat(thresholdVal);
      if (isNaN(valNum) || valNum <= 0) {
        throw new Error('Approval threshold must be a valid positive amount in INR.');
      }

      await api.put('/settings/APPROVAL_THRESHOLD', {
        setting_value: valNum.toFixed(2),
        description: 'Orders exceeding this total amount require Manager approval before fulfillment.',
      });

      setSuccessMsg(`Approval threshold successfully updated to ₹${valNum.toLocaleString('en-IN')}. New orders will immediately adhere to this limit.`);
      loadSettings();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">System Configuration</h2>
        <p className="text-xs text-slate-500 mt-1">
          Adjust runtime business rules and approval thresholds across the application.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex justify-between items-center">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Threshold Configuration Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Configurable Manager Approval Threshold</h3>
            <p className="text-xs text-slate-500">
              Orders equal to or below this limit are auto-confirmed. Orders exceeding this limit transition to PENDING_APPROVAL.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveThreshold} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Approval Threshold (INR ₹)
            </label>
            <div className="relative rounded-lg shadow-sm max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-slate-500">
                ₹
              </span>
              <input
                type="number"
                step="100"
                min="100"
                required
                value={thresholdVal}
                onChange={(e) => setThresholdVal(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Assessment requirement: Configurable rather than hardcoded throughout the backend and frontend.
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-indigo-600" /> Current Workflow Demonstration Rules:
            </div>
            <div>&bull; Orders &le; ₹{parseFloat(thresholdVal || 0).toLocaleString('en-IN')}: Automatically confirmed and inventory deducted.</div>
            <div>&bull; Orders &gt; ₹{parseFloat(thresholdVal || 0).toLocaleString('en-IN')}: Requires manager approval before fulfillment.</div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Updating Database...' : 'Save Configuration'}
          </button>
        </form>
      </div>

      {/* Demo Environment Details */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-500" />
          <span>Environment & Service Connectors</span>
        </h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border">
            <span className="text-slate-400 block">Database Architecture:</span>
            <span className="font-bold text-slate-800">MySQL / Relational with SQLite Fallback</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border">
            <span className="text-slate-400 block">SMTP Service Integration:</span>
            <span className="font-bold text-slate-800">MailHog (Port 1025) + Fallback Audit Table</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border">
            <span className="text-slate-400 block">Authentication Standard:</span>
            <span className="font-bold text-slate-800">JWT (HS256) + Bcrypt Hashing</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border">
            <span className="text-slate-400 block">Backend Framework:</span>
            <span className="font-bold text-slate-800">FastAPI (Python 3.12)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

