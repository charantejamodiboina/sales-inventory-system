import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function Toast({ toast, onDismiss }) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border bg-white max-w-md animate-slide-up">
      {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
      {isError && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
      {!isSuccess && !isError && <Info className="w-5 h-5 text-indigo-500 shrink-0" />}

      <div className="text-sm font-medium text-slate-800">{toast.message}</div>

      <button
        onClick={onDismiss}
        className="ml-auto text-slate-400 hover:text-slate-600 p-0.5 rounded"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

