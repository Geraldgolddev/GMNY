'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label } from '@gmny/ui';
import type { Recipient } from '@gmny/shared';
import { AppShell } from '../../../components/app-shell';
import { api, getAccessToken } from '../../../lib/api';

type FormState = {
  label: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
  isDefault: boolean;
};

const emptyForm: FormState = {
  label: '',
  accountName: '',
  accountNumber: '',
  bankName: '',
  bankCode: '',
  isDefault: false,
};

export default function RecipientsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (access: string) => {
    const rows = await api<Recipient[]>('/recipients', { token: access });
    setRecipients(rows);
  }, []);

  useEffect(() => {
    const access = getAccessToken();
    if (!access) {
      router.replace('/login');
      return;
    }
    setToken(access);
    void load(access).catch((err: Error) => setError(err.message));
  }, [router, load]);

  function startEdit(recipient: Recipient) {
    setEditingId(recipient.id);
    setForm({
      label: recipient.label ?? '',
      accountName: recipient.accountName,
      accountNumber: recipient.accountNumber,
      bankName: recipient.bankName,
      bankCode: recipient.bankCode ?? '',
      isDefault: recipient.isDefault,
    });
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);

    const payload = {
      label: form.label || undefined,
      accountName: form.accountName,
      accountNumber: form.accountNumber,
      bankName: form.bankName,
      bankCode: form.bankCode || undefined,
      isDefault: form.isDefault,
    };

    try {
      if (editingId) {
        await api(`/recipients/${editingId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(payload),
        });
      } else {
        await api('/recipients', {
          method: 'POST',
          token,
          body: JSON.stringify(payload),
        });
      }
      resetForm();
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    if (!token) return;
    if (!window.confirm('Remove this recipient?')) return;
    setError(null);
    try {
      await api(`/recipients/${id}`, { method: 'DELETE', token });
      if (editingId === id) resetForm();
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <AppShell title="Recipients">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)] p-6 shadow-[0_20px_60px_rgba(29,78,216,0.18)]">
          <h2 className="text-lg font-medium text-white">
            {editingId ? 'Edit recipient' : 'Add Nigerian recipient'}
          </h2>
          <p className="mt-1 text-sm text-[var(--gmny-muted)]">
            Save a bank account for NGN payouts. Account numbers must be 10 digits.
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="label">Label (optional)</Label>
              <Input
                id="label"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Mom, Landlord…"
              />
            </div>
            <div>
              <Label htmlFor="accountName">Account name</Label>
              <Input
                id="accountName"
                required
                value={form.accountName}
                onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
                placeholder="Ada Okoro"
              />
            </div>
            <div>
              <Label htmlFor="accountNumber">Account number</Label>
              <Input
                id="accountNumber"
                required
                inputMode="numeric"
                value={form.accountNumber}
                onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                placeholder="0123456789"
              />
            </div>
            <div>
              <Label htmlFor="bankName">Bank name</Label>
              <Input
                id="bankName"
                required
                value={form.bankName}
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                placeholder="GTBank"
              />
            </div>
            <div>
              <Label htmlFor="bankCode">Bank code (optional)</Label>
              <Input
                id="bankCode"
                value={form.bankCode}
                onChange={(e) => setForm((f) => ({ ...f, bankCode: e.target.value }))}
                placeholder="058"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--gmny-blue-300)]">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="h-4 w-4 accent-[var(--gmny-blue-500)]"
              />
              Set as default recipient
            </label>

            {error && (
              <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Saving…' : editingId ? 'Update recipient' : 'Save recipient'}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)] p-6 shadow-[0_20px_60px_rgba(29,78,216,0.18)]">
          <h2 className="text-lg font-medium text-white">Your recipients</h2>
          <p className="mt-1 text-sm text-[var(--gmny-muted)]">
            {recipients.length} active {recipients.length === 1 ? 'recipient' : 'recipients'}
          </p>

          <ul className="mt-5 space-y-3">
            {recipients.length === 0 && (
              <li className="text-sm text-[var(--gmny-muted)]">
                No recipients yet. Add a Nigerian bank account to get started.
              </li>
            )}
            {recipients.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-white/5 bg-black/20 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">
                      {r.label || r.accountName}
                      {r.isDefault ? (
                        <span className="ml-2 rounded bg-[var(--gmny-blue-600)] px-2 py-0.5 text-xs">
                          Default
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">{r.accountName}</p>
                    <p className="mt-1 text-sm text-[var(--gmny-muted)]">
                      {r.bankName}
                      {r.bankCode ? ` · ${r.bankCode}` : ''} · {r.accountNumber}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="secondary" onClick={() => startEdit(r)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => void onDelete(r.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
