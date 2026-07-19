import React, { useState } from 'react';
import { useAuth } from '@clerk/react';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Clock, CheckCircle2, XCircle, ExternalLink, Inbox } from 'lucide-react';

interface PurchaseGroup {
  sessionId: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  modules: string[];
  imageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  telegramMessageId: number | null;
}

function StatusBadge({ status }: { status: PurchaseGroup['status'] }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  }
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" />
        Approved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-red-50 text-red-700 border border-red-200">
      <XCircle className="w-3 h-3" />
      Rejected
    </span>
  );
}

export default function AdminPurchaseRequests() {
  const { getToken } = useAuth();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const { data: requests, isLoading } = useQuery<PurchaseGroup[]>({
    queryKey: ['admin', 'purchases'],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch('/api/admin/purchases', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load purchase requests');
      return res.json();
    },
    refetchInterval: 15_000, // auto-refresh every 15s
  });

  const filtered = requests?.filter(
    (r) => filter === 'all' || r.status === filter
  );

  const counts = {
    all: requests?.length ?? 0,
    pending: requests?.filter((r) => r.status === 'pending').length ?? 0,
    approved: requests?.filter((r) => r.status === 'approved').length ?? 0,
    rejected: requests?.filter((r) => r.status === 'rejected').length ?? 0,
  };

  const receiptUrl = (sessionId: string) =>
    `/api/admin/purchases/receipt/${sessionId}`;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
            Purchase Requests
          </h1>
          <p className="text-muted-foreground">
            Students submit payment receipts here. Approve or reject via Telegram.
          </p>
        </div>
        {counts.pending > 0 && (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-mono font-bold text-sm">
            <Clock className="w-4 h-4" />
            {counts.pending} awaiting review
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-mono font-bold transition-colors border ${
              filter === tab
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-2 opacity-70">({counts[tab]})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-[22px] border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/20 border-b border-border text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
                <th className="p-5 font-bold">Student</th>
                <th className="p-5 font-bold">Module(s)</th>
                <th className="p-5 font-bold">Submitted</th>
                <th className="p-5 font-bold">Status</th>
                <th className="p-5 font-bold text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground font-mono">
                    Loading requests...
                  </td>
                </tr>
              ) : !filtered || filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center">
                    <Inbox className="w-12 h-12 text-muted-foreground opacity-20 mx-auto mb-4" />
                    <p className="font-bold text-foreground">No purchase requests.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {filter !== 'all'
                        ? `No ${filter} requests found.`
                        : 'Students will appear here when they submit receipts.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((req) => (
                  <tr key={req.sessionId} className="hover:bg-secondary/20 transition-colors">
                    {/* Student */}
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-serif font-bold border border-border shrink-0">
                          {req.studentName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-sm">
                            {req.studentName}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {req.studentEmail}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Modules */}
                    <td className="p-5">
                      <div className="flex flex-col gap-1">
                        {req.modules.map((m, i) => (
                          <span
                            key={i}
                            className="text-sm text-foreground font-medium leading-snug"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="p-5">
                      <div className="text-sm text-foreground">
                        {new Date(req.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {new Date(req.createdAt).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-5">
                      <StatusBadge status={req.status} />
                    </td>

                    {/* Receipt */}
                    <td className="p-5 text-right">
                      {req.imageUrl && req.imageUrl !== 'pending' ? (
                        <a
                          href={receiptUrl(req.sessionId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          View
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer hint */}
        <div className="px-6 py-4 border-t border-border bg-secondary/20">
          <p className="text-xs text-muted-foreground font-mono">
            Approval and rejection happen in Telegram. This table auto-refreshes every 15 seconds.
          </p>
        </div>
      </div>
    </div>
  );
}
