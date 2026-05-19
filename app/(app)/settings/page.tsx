'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Plus, Trash2, Settings, UserPlus } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { formatDate, ageFromDob } from '@/lib/utils';
import { MEMBER_COLORS } from '@/lib/types';
import type { FamilyMember, Relationship } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface MemberForm {
  name: string;
  date_of_birth: string;
  relationship: Relationship;
  color: string;
}

export default function SettingsPage() {
  const { data: members = [] } = useSWR<FamilyMember[]>('/api/family-members', fetcher);
  const [showAddMember, setShowAddMember] = useState(false);
  const [form, setForm] = useState<MemberForm>({
    name: '',
    date_of_birth: '',
    relationship: 'self',
    color: MEMBER_COLORS[0],
  });
  const router = useRouter();

  const set = (key: keyof MemberForm, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/family-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        date_of_birth: form.date_of_birth || null,
      }),
    });
    await mutate('/api/family-members');
    setShowAddMember(false);
    setForm({ name: '', date_of_birth: '', relationship: 'self', color: MEMBER_COLORS[0] });
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Delete this family member and all their accounts?')) return;
    await fetch(`/api/family-members/${id}`, { method: 'DELETE' });
    await mutate('/api/family-members');
    await mutate('/api/accounts');
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Family members and app configuration</p>
      </div>

      {/* Family members */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900">Family members</p>
          </div>
          <button className="btn-secondary text-xs" onClick={() => setShowAddMember(true)}>
            <UserPlus className="w-3.5 h-3.5" /> Add member
          </button>
        </div>

        {members.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400 mb-3">No family members yet</p>
            <button className="btn-primary text-sm" onClick={() => setShowAddMember(true)}>
              <Plus className="w-4 h-4" /> Add yourself first
            </button>
          </div>
        )}

        <div className="space-y-2">
          {members.map((member, i) => {
            const age = ageFromDob(member.date_of_birth);
            return (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ backgroundColor: member.color || MEMBER_COLORS[i % MEMBER_COLORS.length] }}
                >
                  {member.name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-400 capitalize">
                    {member.relationship}
                    {member.date_of_birth && ` · Born ${formatDate(member.date_of_birth, 'd MMM yyyy')}`}
                    {age !== null && ` (age ${age})`}
                  </p>
                </div>
                <button
                  className="btn-ghost p-1.5 text-gray-400 hover:text-red-500"
                  onClick={() => handleDeleteMember(member.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* About / integration info */}
      <div className="card">
        <p className="text-sm font-semibold text-gray-900 mb-3">Integrations & data sources</p>
        <div className="space-y-2 text-sm text-gray-600">
          {[
            { name: 'Exchange rates', status: 'Auto', detail: 'Live ECB rates via frankfurter.app — fetched on each balance update' },
            { name: 'Vanguard UK', status: 'Manual', detail: 'No public API available. Log in to Vanguard, note your balance, update here quarterly.' },
            { name: 'Coinbase', status: 'Manual', detail: 'Coinbase has an API — connect by adding your API key (coming soon).' },
            { name: 'Barclays', status: 'Manual', detail: 'UK Open Banking supported — direct link coming soon.' },
            { name: 'Amex UK', status: 'Manual', detail: 'Manual entry for now — check your Amex app for the balance.' },
            { name: 'Aviva Pension', status: 'Manual', detail: 'No public API. Check your Aviva dashboard and update quarterly.' },
          ].map((item) => (
            <div key={item.name} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className={`mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                item.status === 'Auto' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {item.status}
              </div>
              <div>
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <div className="card">
        <button
          onClick={handleSignOut}
          className="btn-danger w-full"
        >
          Sign out
        </button>
      </div>

      {/* Add member modal */}
      <Modal open={showAddMember} onClose={() => setShowAddMember(false)} title="Add family member">
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Sarah" required />
          </div>
          <div>
            <label className="label">Relationship</label>
            <select className="input" value={form.relationship} onChange={(e) => set('relationship', e.target.value as Relationship)}>
              <option value="self">Self</option>
              <option value="spouse">Spouse / Partner</option>
              <option value="child">Child</option>
            </select>
          </div>
          <div>
            <label className="label">Date of birth (optional — used for age display and projections)</label>
            <input className="input" type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
          </div>
          <div>
            <label className="label">Colour</label>
            <div className="flex gap-2">
              {MEMBER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowAddMember(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1">Add member</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
