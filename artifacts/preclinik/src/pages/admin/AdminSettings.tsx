import React, { useState } from 'react';
import { Settings, Shield, Database, UserPlus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import { toast } from 'sonner';

// ── Admin-users CRUD helpers ─────────────────────────────────────────────────

interface AdminEntry {
  email: string;
  addedAt: string;
}

async function authedFetch(
  path: string,
  getToken: () => Promise<string | null>,
  options?: RequestInit,
) {
  const token = await getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminSettings() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [newEmail, setNewEmail] = useState('');

  const gt = () => getToken();

  const { data: admins, isLoading: adminsLoading } = useQuery<AdminEntry[]>({
    queryKey: ['/admin/admins'],
    queryFn: () => authedFetch('/api/admin/admins', gt),
    staleTime: 0,
  });

  const addAdmin = useMutation({
    mutationFn: (email: string) =>
      authedFetch('/api/admin/admins', gt, { method: 'POST', body: JSON.stringify({ email }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/admin/admins'] });
      toast.success('Admin added');
      setNewEmail('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeAdmin = useMutation({
    mutationFn: (email: string) =>
      authedFetch(`/api/admin/admins/${encodeURIComponent(email)}`, gt, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/admin/admins'] });
      toast.success('Admin removed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    addAdmin.mutate(email);
  };

  const isLastAdmin = (admins?.length ?? 0) <= 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Platform Settings</h1>
        <p className="text-muted-foreground">Configure application preferences and defaults.</p>
      </div>

      <div className="bg-white rounded-[22px] border border-border shadow-sm overflow-hidden divide-y divide-border">

        {/* General */}
        <div className="p-8 flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/3">
            <div className="flex items-center gap-2 mb-2 text-foreground font-bold">
              <Settings className="w-4 h-4 text-primary" />
              General
            </div>
            <p className="text-sm text-muted-foreground">Basic platform information and localization.</p>
          </div>
          <div className="w-full md:w-2/3 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground font-mono uppercase tracking-widest">Platform Name</label>
              <input type="text" defaultValue="PreClinik" className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground font-mono uppercase tracking-widest">Support Email</label>
              <input type="email" defaultValue="support@preclinik.dz" className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all" />
            </div>
          </div>
        </div>

        {/* Currency */}
        <div className="p-8 flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/3">
            <div className="flex items-center gap-2 mb-2 text-foreground font-bold">
              <Database className="w-4 h-4 text-primary" />
              Currency & Pricing
            </div>
            <p className="text-sm text-muted-foreground">Default currency and payment settings.</p>
          </div>
          <div className="w-full md:w-2/3 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground font-mono uppercase tracking-widest">Default Currency</label>
              <select className="w-full h-12 px-4 rounded-xl border border-border bg-background focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-bold">
                <option value="DZD">DZD (Algerian Dinar)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Access Control */}
        <div className="p-8 flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/3">
            <div className="flex items-center gap-2 mb-2 text-foreground font-bold">
              <Shield className="w-4 h-4 text-primary" />
              Access Control
            </div>
            <p className="text-sm text-muted-foreground">Manage registration and permissions.</p>
          </div>
          <div className="w-full md:w-2/3 space-y-4">
            <label className="flex items-center gap-3 p-4 border border-border rounded-xl cursor-pointer hover:bg-secondary/30 transition-colors">
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-primary border-border focus:ring-primary" />
              <div>
                <div className="font-bold text-sm">Allow new student registrations</div>
                <div className="text-xs text-muted-foreground font-mono">Anyone can create an account</div>
              </div>
            </label>
          </div>
        </div>

        {/* Admin Users */}
        <div className="p-8 flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/3">
            <div className="flex items-center gap-2 mb-2 text-foreground font-bold">
              <UserPlus className="w-4 h-4 text-primary" />
              Admin Users
            </div>
            <p className="text-sm text-muted-foreground">
              Email addresses with full admin access. Changes take effect immediately — no deploy needed.
            </p>
          </div>
          <div className="w-full md:w-2/3 space-y-4">

            {/* Add new admin */}
            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="doctor@example.com"
                required
                className="flex-1 h-12 px-4 rounded-xl border border-border bg-background focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all font-mono text-sm"
              />
              <button
                type="submit"
                disabled={addAdmin.isPending || !newEmail.trim()}
                className="h-12 px-5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-60 flex items-center gap-2 whitespace-nowrap"
              >
                {addAdmin.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Add admin
              </button>
            </form>

            {/* Current admin list */}
            <div className="rounded-xl border border-border overflow-hidden">
              {adminsLoading ? (
                <div className="p-6 flex items-center justify-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading admins…
                </div>
              ) : admins && admins.length > 0 ? (
                <ul className="divide-y divide-border">
                  {admins.map((a) => (
                    <li
                      key={a.email}
                      className="flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-mono text-foreground">{a.email}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          Added {new Date(a.addedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <button
                        onClick={() => removeAdmin.mutate(a.email)}
                        disabled={removeAdmin.isPending || isLastAdmin}
                        title={isLastAdmin ? "Cannot remove the last admin" : "Remove admin"}
                        className={`p-2 rounded-lg transition-colors ${
                          isLastAdmin
                            ? 'text-border cursor-not-allowed'
                            : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                        } disabled:opacity-40`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-6 text-sm text-muted-foreground text-center">No admins configured.</p>
              )}
            </div>

            {isLastAdmin && admins && admins.length > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 font-mono">
                <AlertCircle className="w-3.5 h-3.5" />
                At least one admin must remain — add another before removing this one.
              </p>
            )}
          </div>
        </div>

        <div className="p-8 bg-secondary/30 flex justify-end">
          <button className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all">
            Save Settings
          </button>
        </div>

      </div>
    </div>
  );
}
