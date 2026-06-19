import React, { useState, useCallback } from 'react';
import { Search, CheckCircle, XCircle, AlertCircle, Loader, ExternalLink, Download } from 'lucide-react';

// States for the two-step import flow
const STATE = {
  IDLE: 'idle',
  CHECKING: 'checking',
  FOUND: 'found',
  NOT_FOUND: 'not_found',
  ALREADY_IMPORTED: 'already_imported',
  API_ERROR: 'api_error',
  CONFIRMING: 'confirming',
  SUCCESS: 'success',
};

const money = (v) => (Number(v) || 0).toLocaleString('en-US') + ' MMK';

function PreviewField({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-slate-500 min-w-[120px] shrink-0">{label}</span>
      <span className="text-slate-200 font-medium break-words">{value}</span>
    </div>
  );
}

export default function RepairPlatform({ onOpenRepair }) {
  const [repairId, setRepairId] = useState('');
  const [flowState, setFlowState] = useState(STATE.IDLE);
  const [preview, setPreview] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successId, setSuccessId] = useState('');

  const reset = useCallback(() => {
    setFlowState(STATE.IDLE);
    setPreview(null);
    setErrorMsg('');
    setSuccessId('');
  }, []);

  const handleCheck = useCallback(async () => {
    const id = repairId.trim();
    if (!id) return;
    setFlowState(STATE.CHECKING);
    setPreview(null);
    setErrorMsg('');
    try {
      const res = await fetch('/api/repair-platform/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repairId: id }),
      });
      const data = await res.json().catch(() => ({ ok: false, message: 'Server returned invalid JSON format' }));

      if (!res.ok || !data.ok) {
        setErrorMsg(data.message || 'Lookup failed');
        setFlowState(STATE.API_ERROR);
        return;
      }

      if (!data.found) {
        setFlowState(STATE.NOT_FOUND);
        return;
      }

      if (data.alreadyImported) {
        setPreview(data.repair);
        setFlowState(STATE.ALREADY_IMPORTED);
        return;
      }

      setPreview(data.repair);
      setFlowState(STATE.FOUND);
    } catch (err) {
      setErrorMsg(err.message || 'Network error');
      setFlowState(STATE.API_ERROR);
    }
  }, [repairId]);

  const handleConfirmImport = useCallback(async () => {
    if (!preview) return;
    setFlowState(STATE.CONFIRMING);
    try {
      const res = await fetch('/api/repair-platform/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preview),
      });
      const data = await res.json().catch(() => ({ ok: false, message: 'Server returned invalid JSON format' }));

      if (!res.ok || !data.ok) {
        if (data.alreadyImported) {
          setFlowState(STATE.ALREADY_IMPORTED);
          return;
        }
        setErrorMsg(data.message || 'Import failed');
        setFlowState(STATE.API_ERROR);
        return;
      }

      setSuccessId(data.id || preview.repairId);
      setFlowState(STATE.SUCCESS);
    } catch (err) {
      setErrorMsg(err.message || 'Network error');
      setFlowState(STATE.API_ERROR);
    }
  }, [preview]);

  const handleCancel = useCallback(() => {
    reset();
  }, [reset]);

  const handleSuccessOpen = useCallback(() => {
    if (typeof onOpenRepair === 'function') onOpenRepair(successId);
    reset();
    setRepairId('');
  }, [onOpenRepair, successId, reset]);

  const isChecking = flowState === STATE.CHECKING;
  const isConfirming = flowState === STATE.CONFIRMING;
  const busy = isChecking || isConfirming;

  return (
    <section className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Download size={20} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-200">Import Existing Repair ID</h2>
            <p className="text-xs text-slate-500">Repair Platform မှ ပြင်ဆင်မှုတစ်ခုကို ဤ tenant ထဲသို့ တင်သွင်းရန်</p>
          </div>
        </div>

        {/* Step 1 – Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 block">Repair ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={repairId}
              onChange={(e) => { setRepairId(e.target.value); if (flowState !== STATE.IDLE) reset(); }}
              onKeyDown={(e) => e.key === 'Enter' && !busy && handleCheck()}
              placeholder="e.g. AC4472"
              disabled={busy}
              className="flex-1 bg-slate-900 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-4 py-2.5 text-slate-200 text-sm font-mono placeholder-slate-600 outline-none transition disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleCheck}
              disabled={!repairId.trim() || busy}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shrink-0 transition"
            >
              {isChecking
                ? <Loader size={16} className="animate-spin" />
                : <Search size={16} />}
              {isChecking ? 'စစ်ဆေးနေသည်…' : 'ရှာဖွေစစ်ဆေးမည်'}
            </button>
          </div>
        </div>

        {/* Not Found */}
        {flowState === STATE.NOT_FOUND && (
          <div className="flex items-start gap-3 bg-slate-900 border border-slate-700 rounded-xl p-4">
            <XCircle size={18} className="text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-300">
                Repair ID <span className="font-mono text-amber-400">{repairId}</span> ကို ရှာမတွေ့ပါ။
              </p>
              <p className="text-xs text-slate-500 mt-0.5">ID မှန်ကန်မှုကို စစ်ဆေးပြီး ထပ်ကြိုးစားပါ။</p>
            </div>
          </div>
        )}

        {/* API Error */}
        {flowState === STATE.API_ERROR && (
          <div className="flex items-start gap-3 bg-red-950/40 border border-red-800/50 rounded-xl p-4">
            <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-300">Lookup မအောင်မြင်ပါ</p>
              <p className="text-xs text-red-400 mt-0.5">{errorMsg}</p>
              <button onClick={reset} className="mt-2 text-xs text-red-300 underline">ပြန်ကြိုးစားပါ</button>
            </div>
          </div>
        )}

        {/* Already Imported */}
        {flowState === STATE.ALREADY_IMPORTED && preview && (
          <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-amber-400" />
              <span className="text-sm font-bold text-amber-400">
                Already imported — <span className="font-mono">{preview.repairId}</span>
              </span>
            </div>
            <div className="space-y-1.5 pl-1">
              <PreviewField label="Customer" value={preview.customerName} />
              <PreviewField label="Device" value={[preview.deviceBrand, preview.deviceModel].filter(Boolean).join(' ')} />
              <PreviewField label="Problem" value={preview.problem} />
              <PreviewField label="Status" value={preview.status} />
              <PreviewField label="Cost" value={preview.finalCost != null ? money(preview.finalCost) : null} />
            </div>
            <div className="flex gap-2 pt-1">
              {typeof onOpenRepair === 'function' && (
                <button
                  onClick={() => { onOpenRepair(preview.repairId); reset(); setRepairId(''); }}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5"
                >
                  <ExternalLink size={13} /> Open Existing Record
                </button>
              )}
              <button onClick={() => { reset(); setRepairId(''); }} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-lg text-xs">
                Close
              </button>
            </div>
          </div>
        )}

        {/* Found – Confirmation Preview */}
        {(flowState === STATE.FOUND || flowState === STATE.CONFIRMING) && preview && (
          <div className="bg-slate-900 border border-emerald-600/30 rounded-xl p-4 space-y-3">
            <p className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">— Confirm Import Preview —</p>
            <div className="space-y-1.5 pl-1">
              <PreviewField label="Repair ID" value={preview.repairId} />
              <PreviewField label="Customer" value={preview.customerName} />
              <PreviewField label="Phone" value={preview.customerPhone} />
              <PreviewField label="Device" value={[preview.deviceBrand, preview.deviceModel].filter(Boolean).join(' ')} />
              <PreviewField label="Problem" value={preview.problem} />
              <PreviewField label="Source Shop" value={preview.sourceShopName} />
              <PreviewField label="Status" value={preview.status} />
              {preview.finalCost != null && (
                <PreviewField label="Repair Amount" value={money(preview.finalCost)} />
              )}
            </div>
            <div className="flex gap-2 pt-1 flex-wrap">
              <button
                onClick={handleConfirmImport}
                disabled={isConfirming}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-lg text-xs flex items-center gap-2"
              >
                {isConfirming ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {isConfirming ? 'Importing…' : 'Confirm Import'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isConfirming}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-bold px-5 py-2 rounded-lg text-xs flex items-center gap-2"
              >
                <XCircle size={14} /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* Success */}
        {flowState === STATE.SUCCESS && (
          <div className="bg-emerald-950/40 border border-emerald-700/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-400" />
              <span className="text-sm font-bold text-emerald-300">
                Repair <span className="font-mono">{successId}</span> ကို အောင်မြင်စွာ တင်သွင်းပြီးပါပြီ။
              </span>
            </div>
            <div className="flex gap-2">
              {typeof onOpenRepair === 'function' && (
                <button
                  onClick={handleSuccessOpen}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5"
                >
                  <ExternalLink size={13} /> Open Repair Record
                </button>
              )}
              <button
                onClick={() => { reset(); setRepairId(''); }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-lg text-xs"
              >
                Import Another
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
