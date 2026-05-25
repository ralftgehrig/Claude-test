'use client';

import { useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Account, BalanceSnapshot } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props {
  account: Account;
  onClose: () => void;
}

interface EditState {
  balance: string;
  snapshot_date: string;
  notes: string;
}

export default function SnapshotHistoryModal({ account, onClose }: Props) {
  const key = `/api/balances?account_id=${account.id}`;
  const { data: snapshots = [], mutate } = useSWR<BalanceSnapshot[]>(key, fetcher);
  const [editing, setEditing] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ balance: '', snapshot_date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const sorted = [...snapshots].sort((a, b) =>
    a.snapshot_date < b.snapshot_date ? -1 : 1
  );

  const startEdit = (snap: BalanceSnapshot) => {
    setEditing(snap.id);
    setEditState({
      balance: snap.balance.toString(),
      snapshot_date: snap.snapshot_date,
      notes: snap.notes ?? '',
    });
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = async (snapId: string) => {
    setSaving(true);
    await fetch(`/api/balances/${snapId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        balance: parseFloat(editState.balance),
        currency: account.currency,
        snapshot_date: editState.snapshot_date,
        notes: editState.notes || null,
      }),
    });
    await mutate();
    await globalMutate('/api/accounts');
    await globalMutate('/api/net-worth-history');
    setEditing(null);
    setSaving(false);
  };

  const deleteSnap = async (snapId: string) => {
    if (!confirm('Delete this data point?')) return;
    await fetch(`/api/balances/${snapId}`, { method: 'DELETE' });
    await mutate();
    await globalMutate('/api/accounts');
    await globalMutate('/api/net-worth-history');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      <div
        className="relative w-full sm:max-w-2xl animate-sheet-up sm:animate-slide-up max-h-[88vh] flex flex-col"
        style={{
          background: '#F2F2F7',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -1px 0 rgba(0,0,0,0.08), 0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: 'rgba(60,60,67,0.22)' }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{
            background: 'rgba(242,242,247,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '0.5px solid rgba(60,60,67,0.18)',
          }}
        >
          <div>
            <h2 className="text-[17px] font-semibold" style={{ color: '#1C1C1E' }}>{account.name}</h2>
            <p className="text-[12px]" style={{ color: '#8E8E93' }}>{sorted.length} data points · {account.currency}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold"
            style={{ background: 'rgba(118,118,128,0.18)', color: '#8E8E93' }}
          >
            ✕
          </button>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1 px-4 py-3">
          {sorted.length === 0 && (
            <p className="text-center py-8 text-sm" style={{ color: '#8E8E93' }}>No data points recorded</p>
          )}

          <div className="space-y-1.5">
            {sorted.map((snap) => {
              const isEditing = editing === snap.id;
              return (
                <div
                  key={snap.id}
                  className="rounded-xl px-4 py-3"
                  style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-medium block mb-1" style={{ color: '#8E8E93' }}>Date</label>
                          <input
                            className="input text-sm py-1.5"
                            type="date"
                            value={editState.snapshot_date}
                            onChange={(e) => setEditState((p) => ({ ...p, snapshot_date: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium block mb-1" style={{ color: '#8E8E93' }}>Balance ({account.currency})</label>
                          <input
                            className="input text-sm py-1.5"
                            type="number"
                            step="0.01"
                            value={editState.balance}
                            onChange={(e) => setEditState((p) => ({ ...p, balance: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium block mb-1" style={{ color: '#8E8E93' }}>Notes</label>
                        <input
                          className="input text-sm py-1.5"
                          value={editState.notes}
                          onChange={(e) => setEditState((p) => ({ ...p, notes: e.target.value }))}
                          placeholder="Optional note"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          className="btn-secondary flex-1 text-xs py-1.5"
                          onClick={cancelEdit}
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                        <button
                          className="btn-primary flex-1 text-xs py-1.5"
                          onClick={() => saveEdit(snap.id)}
                          disabled={saving}
                        >
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold" style={{ color: '#1C1C1E' }}>
                          {formatDate(snap.snapshot_date, 'MMMM yyyy')}
                        </p>
                        {snap.notes && (
                          <p className="text-[11px] mt-0.5 truncate" style={{ color: '#8E8E93' }}>{snap.notes}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[14px] font-semibold" style={{ color: '#1C1C1E' }}>
                          {account.currency !== 'GBP' && `${account.currency} `}
                          {snap.balance.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </p>
                        {account.currency !== 'GBP' && (
                          <p className="text-[11px]" style={{ color: '#8E8E93' }}>
                            £{snap.gbp_balance.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                          style={{ background: 'rgba(0,122,255,0.1)', color: '#007AFF' }}
                          onClick={() => startEdit(snap)}
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                          style={{ background: 'rgba(255,59,48,0.1)', color: '#FF3B30' }}
                          onClick={() => deleteSnap(snap.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
