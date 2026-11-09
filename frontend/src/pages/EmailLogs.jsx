import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Mail, CheckCircle2, AlertCircle, Eye, RefreshCw, Send } from 'lucide-react';
import { Modal } from '../components/UI/Modal';

export function EmailLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.get('/emails/logs?limit=50');
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900">SMTP Email Notification Inbox & Logs</h2>
          <p className="text-xs text-slate-500">
            Real-time delivery verification for manager approvals, order approvals, and rejection notices.
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Inbox</span>
        </button>
      </div>

      <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            SMTP Testing Server: Configured for <span className="font-bold">MailHog (Port 1025 / Web UI Port 8025)</span>.
            If MailHog is offline, notifications automatically persist here in fallback mode without interrupting orders.
          </span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading email audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No notification emails dispatched yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Delivery Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-center">Inspect Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        log.event_type === 'APPROVAL_REQUEST'
                          ? 'bg-amber-100 text-amber-800'
                          : log.event_type === 'ORDER_APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {log.event_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{log.recipient_name}</div>
                      <div className="text-slate-400 text-[11px] font-mono">{log.recipient_email}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate" title={log.subject}>
                      {log.subject}
                    </td>
                    <td className="py-3 px-4">
                      {log.delivery_status === 'SENT' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Delivered via SMTP
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 font-medium" title={log.error_message}>
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> Logged (SMTP Offline)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedEmail(log)}
                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                        title="Read Full Email Message"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Email Body Preview Modal */}
      <Modal
        isOpen={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
        title="Email Notification Content"
        maxWidth="max-w-xl"
      >
        {selectedEmail && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border rounded-lg space-y-1">
              <div><span className="font-bold text-slate-600">To: </span>{selectedEmail.recipient_name} &lt;{selectedEmail.recipient_email}&gt;</div>
              <div><span className="font-bold text-slate-600">Subject: </span>{selectedEmail.subject}</div>
              <div><span className="font-bold text-slate-600">Dispatched: </span>{new Date(selectedEmail.created_at).toLocaleString()}</div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Message Body</label>
              <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs whitespace-pre-wrap overflow-x-auto">
                {selectedEmail.body_text}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

