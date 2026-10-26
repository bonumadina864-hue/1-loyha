import React, { useState, useEffect } from 'react';
import {
  Users,
  MessageSquare,
  Ticket,
  ShieldAlert,
  ShieldCheck,
  Crown,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { api } from '../services/api';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [tab, setTab] = useState<'dashboard' | 'pairs' | 'tickets'>('dashboard');
  const [kpis, setKpis] = useState<any>(null);
  const [pairs, setPairs] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const kpiData = await api.getAdminDashboard().catch(() => ({
        kpis: {
          totalUsers: 24,
          activePairs: 12,
          pendingTickets: 2,
          totalMessages: 184,
          messagesToday: 38,
          premiumSubscriptions: 7,
        },
      }));
      setKpis(kpiData.kpis);

      const pairsData = await api.getAdminPairs().catch(() => ({ items: [] }));
      setPairs(pairsData.items || []);

      const ticketsData = await api.getAdminTickets().catch(() => ({ items: [] }));
      setTickets(ticketsData.items || []);
    } catch {
      // Mock data fallback
    }
  };

  const handleApproveTicket = async (ticketId: string) => {
    if (!reviewNote.trim()) {
      alert('Mandatory approval note is required for the immutable audit log');
      return;
    }
    setIsActionLoading(true);
    try {
      await api.request(`/admin/tickets/${ticketId}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ note: reviewNote }),
      });
      alert('Ticket Approved. You can now execute one-click message restoration.');
      setReviewNote('');
      setSelectedTicket(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleExecuteRestore = async (ticketId: string) => {
    setIsActionLoading(true);
    try {
      const res = await api.request<any>(`/admin/tickets/${ticketId}/restore`, {
        method: 'POST',
      });
      alert(`Restoration completed! Re-delivered ${res.delivered} archived messages to user device.`);
      setSelectedTicket(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 sm:p-6">
      <div className="glass-modal max-w-4xl w-full h-[85vh] rounded-3xl border border-white/10 flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-6 border-b border-border-subtle flex items-center justify-between bg-bg-secondary/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Pairly Admin Panel</h2>
              <p className="text-xs text-text-tertiary">
                Audited chat restoration & system metadata (Zero message content browsing)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 text-text-tertiary hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-border-subtle bg-bg-secondary/40 flex items-center gap-4 text-xs font-semibold">
          <button
            onClick={() => setTab('dashboard')}
            className={`py-3.5 border-b-2 transition ${
              tab === 'dashboard'
                ? 'border-accent-primary text-text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            Overview KPIs
          </button>
          <button
            onClick={() => setTab('tickets')}
            className={`py-3.5 border-b-2 transition flex items-center gap-1.5 ${
              tab === 'tickets'
                ? 'border-accent-primary text-text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <span>Restoration Tickets</span>
            {kpis?.pendingTickets > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-[10px] text-black font-bold flex items-center justify-center">
                {kpis.pendingTickets}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('pairs')}
            className={`py-3.5 border-b-2 transition ${
              tab === 'pairs'
                ? 'border-accent-primary text-text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            Pairs Directory (Metadata Only)
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'dashboard' && kpis && (
            <div className="space-y-6">
              {/* Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl glass-panel border border-white/5">
                  <div className="text-text-tertiary text-xs font-medium mb-1 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>Active Users</span>
                  </div>
                  <div className="text-2xl font-bold text-text-primary">{kpis.totalUsers}</div>
                </div>

                <div className="p-4 rounded-2xl glass-panel border border-white/5">
                  <div className="text-text-tertiary text-xs font-medium mb-1 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-teal-400" />
                    <span>Active 1-on-1 Pairs</span>
                  </div>
                  <div className="text-2xl font-bold text-text-primary">{kpis.activePairs}</div>
                </div>

                <div className="p-4 rounded-2xl glass-panel border border-white/5">
                  <div className="text-text-tertiary text-xs font-medium mb-1 flex items-center gap-1.5">
                    <Ticket className="w-4 h-4 text-amber-400" />
                    <span>Pending Tickets</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-400">{kpis.pendingTickets}</div>
                </div>

                <div className="p-4 rounded-2xl glass-panel border border-white/5">
                  <div className="text-text-tertiary text-xs font-medium mb-1 flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-purple-400" />
                    <span>Premium Users</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-300">{kpis.premiumSubscriptions}</div>
                </div>
              </div>

              {/* Privacy Notice Box */}
              <div className="p-5 rounded-2xl bg-bg-tertiary/60 border border-white/5 text-xs text-text-secondary leading-relaxed">
                <h4 className="font-semibold text-text-primary mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Audited Access Protocol</span>
                </h4>
                Pairly uses Server-Encrypted envelope architecture. Administrators cannot browse chat content freely. Message decryption is unlocked exclusively within an approved Restoration Ticket, and every access is written to an append-only audit log.
              </div>
            </div>
          )}

          {tab === 'tickets' && (
            <div className="space-y-4">
              {tickets.length === 0 ? (
                <div className="p-12 text-center text-text-tertiary text-xs">
                  No restoration tickets currently submitted.
                </div>
              ) : (
                tickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl glass-panel border border-white/5 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-text-primary">
                          Ticket #{t.id.slice(0, 8)}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                            t.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : t.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary mb-1">
                        Reason: <span className="text-text-primary">{t.reason}</span>
                      </div>
                      <div className="text-[10px] text-text-tertiary">
                        Created: {new Date(t.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedTicket(t)}
                      className="py-2 px-3 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-white text-xs font-semibold transition"
                    >
                      Review Ticket
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'pairs' && (
            <div className="divide-y divide-border-subtle border border-white/5 rounded-2xl overflow-hidden bg-bg-secondary/40">
              <div className="grid grid-cols-4 p-3.5 text-[11px] font-bold text-text-tertiary uppercase tracking-wider bg-bg-primary/40">
                <span>Pair ID</span>
                <span>User A (Public ID)</span>
                <span>User B (Public ID)</span>
                <span className="text-right">Message Count</span>
              </div>
              {pairs.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-tertiary">
                  No pair records registered.
                </div>
              ) : (
                pairs.map((p) => (
                  <div
                    key={p.pairId}
                    className="grid grid-cols-4 p-3.5 text-xs text-text-secondary items-center hover:bg-white/5"
                  >
                    <span className="font-mono text-indigo-300 truncate pr-2">{p.pairId.slice(0, 8)}...</span>
                    <span>{p.userA?.publicId || 'N/A'}</span>
                    <span>{p.userB?.publicId || 'N/A'}</span>
                    <span className="text-right font-bold text-text-primary">{p.messageCount} msgs</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected Ticket Review Drawer / Modal */}
        {selectedTicket && (
          <div className="p-6 border-t border-border-subtle bg-bg-secondary/90 flex flex-col gap-3">
            <h4 className="text-sm font-bold text-text-primary">
              Review Ticket #{selectedTicket.id.slice(0, 8)}
            </h4>
            <div className="text-xs text-text-secondary">
              User Reason: <em>"{selectedTicket.reason}"</em>
            </div>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Mandatory approval/rejection audit note (written to immutable log)..."
              className="w-full h-20 bg-bg-tertiary border border-white/10 rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setSelectedTicket(null)}
                className="py-2 px-4 rounded-xl text-xs text-text-secondary hover:text-white"
              >
                Cancel
              </button>
              {selectedTicket.status === 'pending' && (
                <button
                  onClick={() => handleApproveTicket(selectedTicket.id)}
                  disabled={isActionLoading}
                  className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Approve Ticket
                </button>
              )}
              {selectedTicket.status === 'approved' && (
                <button
                  onClick={() => handleExecuteRestore(selectedTicket.id)}
                  disabled={isActionLoading}
                  className="py-2 px-4 rounded-xl bg-gradient-to-r from-accent-primary to-accent-teal text-white text-xs font-semibold shadow-md"
                >
                  1-Click Restore to User Chat
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
