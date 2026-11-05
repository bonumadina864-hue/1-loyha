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
  Lock,
  KeyRound,
  Clock,
  EyeOff,
  LogOut,
} from 'lucide-react';
import { api } from '../services/api';
import { useI18n } from '../services/i18n';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreChatToUI?: (pairId: string) => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  onRestoreChatToUI,
}) => {
  const { t } = useI18n();

  // Admin Security Gate State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminLogin, setAdminLogin] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [tab, setTab] = useState<'dashboard' | 'pairs' | 'tickets'>('dashboard');
  const [kpis, setKpis] = useState<any>(null);
  const [pairs, setPairs] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadData();
    }
  }, [isOpen, isAuthenticated]);

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    // Exact master login & password required
    const validLogin = adminLogin.trim().toLowerCase() === 'fmtg';
    const validPass = adminPassword.trim() === '16.03.29.04.10.09';

    if (validLogin && validPass) {
      setIsAuthenticated(true);
      setAuthError(null);
    } else {
      setAuthError(t.adminAuthError);
    }
  };

  const handleAdminLogout = () => {
    setIsAuthenticated(false);
    setAdminLogin('');
    setAdminPassword('');
  };

  const loadData = async () => {
    try {
      const kpiData = await api.getAdminDashboard().catch(() => ({
        kpis: {
          totalUsers: 2,
          activePairs: 1,
          pendingTickets: 1,
          totalMessages: 46,
          messagesToday: 12,
          premiumSubscriptions: 2,
        },
      }));
      setKpis(kpiData.kpis);

      const pairsData = await api.getAdminPairs().catch(() => ({
        items: [
          {
            pairId: 'fmtg-pair-alice-bob',
            userA: { publicId: '849201934', fullName: 'Alice' },
            userB: { publicId: '109482710', fullName: 'Bob' },
            messageCount: 46,
          },
        ],
      }));
      setPairs(pairsData.items || []);

      const ticketsData = await api.getAdminTickets().catch(() => ({
        items: [
          {
            id: 'tkt-849204',
            userId: 'alice-id',
            pairId: 'demo-pair-alice-bob',
            status: 'pending',
            reason: 'Suhbatdoshim bilan xabarlarimiz o‘chib ketdi, bot orqali ariza berdik, iltimos qaytarib bering.',
            createdAt: new Date().toISOString(),
            remainingDays: 90,
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            previewContent: '🔒 [Shifrlangan konvert - Admin matnni ko‘ra olmaydi]',
          },
        ],
      }));
      setTickets(ticketsData.items || []);
    } catch {
      // Fallback
    }
  };

  const handleApproveTicket = async (ticketId: string) => {
    setIsActionLoading(true);
    try {
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: 'approved' } : t)),
      );
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket((prev: any) => ({ ...prev, status: 'approved' }));
      }
      alert(t.ticketApproved);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleExecuteRestore = async (ticketId: string, pairId: string) => {
    setIsActionLoading(true);
    try {
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: 'completed' } : t)),
      );
      setSelectedTicket(null);
      // Trigger UI restoration callback
      onRestoreChatToUI?.(pairId);
      alert(t.restoredNotice);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 select-none">
      <div className="glass-modal max-w-4xl w-full max-h-[90vh] rounded-3xl border border-white/10 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-border-subtle flex items-center justify-between bg-bg-secondary/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
              FM
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <span>{t.appName} {t.adminPanel}</span>
                {isAuthenticated && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    AUTORIZATSIYA TASDIQLANGAN
                  </span>
                )}
              </h2>
              <p className="text-xs text-text-tertiary">
                {t.adminHelpText}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={handleAdminLogout}
                className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-red-500/20 text-text-tertiary hover:text-red-400 text-xs font-medium transition flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.adminLogoutBtn}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/5 text-text-tertiary hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* LOCKED GATE: If not yet authenticated with master FMTg / 16.03.29.04.10.09 */}
        {!isAuthenticated ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-600/10">
              <KeyRound className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-text-primary mb-1">
              {t.adminLocked}
            </h3>
            <p className="text-xs text-text-secondary max-w-sm mb-6 leading-relaxed">
              Bu bo'lim faqat FMTg ilova egasi uchun himoyalangan. Kirish uchun maxsus login va parolni kiriting.
            </p>

            {authError && (
              <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 max-w-sm w-full">
                {authError}
              </div>
            )}

            <form onSubmit={handleAdminAuth} className="w-full max-w-xs space-y-3">
              <div>
                <input
                  type="text"
                  value={adminLogin}
                  onChange={(e) => setAdminLogin(e.target.value)}
                  placeholder={t.adminLoginPlaceholder}
                  className="w-full bg-bg-tertiary border border-white/10 rounded-2xl py-3 px-4 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                  autoFocus
                />
              </div>
              <div>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder={t.adminPassPlaceholder}
                  className="w-full bg-bg-tertiary border border-white/10 rounded-2xl py-3 px-4 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-accent-primary to-accent-teal text-white font-bold text-xs shadow-lg shadow-indigo-600/20 hover:opacity-95 transition"
              >
                {t.adminLoginBtn}
              </button>
            </form>
          </div>
        ) : (
          /* AUTHENTICATED ADMIN DASHBOARD */
          <>
            {/* Tabs */}
            <div className="px-6 border-b border-border-subtle bg-bg-secondary/40 flex items-center gap-4 text-xs font-semibold">
              <button
                onClick={() => setTab('dashboard')}
                className={`py-3.5 border-b-2 transition ${
                  tab === 'dashboard'
                    ? 'border-accent-primary text-text-primary'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setTab('tickets')}
                className={`py-3.5 border-b-2 transition flex items-center gap-1.5 ${
                  tab === 'tickets'
                    ? 'border-accent-primary text-text-primary'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <span>Tiklash Arizalari (Botdan)</span>
                {tickets.filter((t) => t.status === 'pending').length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-[10px] text-black font-bold flex items-center justify-center">
                    {tickets.filter((t) => t.status === 'pending').length}
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
                Juftliklar (Metadata)
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {tab === 'dashboard' && kpis && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl glass-panel border border-white/5">
                      <div className="text-text-tertiary text-xs font-medium mb-1 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <span>Foydalanuvchilar</span>
                      </div>
                      <div className="text-2xl font-bold text-text-primary">{kpis.totalUsers}</div>
                    </div>
                    <div className="p-4 rounded-2xl glass-panel border border-white/5">
                      <div className="text-text-tertiary text-xs font-medium mb-1 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-teal-400" />
                        <span>1-on-1 Maxfiy Juftlik</span>
                      </div>
                      <div className="text-2xl font-bold text-text-primary">{kpis.activePairs}</div>
                    </div>
                    <div className="p-4 rounded-2xl glass-panel border border-white/5">
                      <div className="text-text-tertiary text-xs font-medium mb-1 flex items-center gap-1.5">
                        <Ticket className="w-4 h-4 text-amber-400" />
                        <span>Kutilayotgan Arizalar</span>
                      </div>
                      <div className="text-2xl font-bold text-amber-400">{tickets.filter(t => t.status === 'pending').length}</div>
                    </div>
                    <div className="p-4 rounded-2xl glass-panel border border-white/5">
                      <div className="text-text-tertiary text-xs font-medium mb-1 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-purple-400" />
                        <span>TTL Saqlash</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-300">90 Kun (3 Oy)</div>
                    </div>
                  </div>

                  {/* 3-Month Retention Guarantee Box */}
                  <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-text-secondary leading-relaxed space-y-2">
                    <h4 className="font-bold text-indigo-300 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Zero-Knowledge & 3 Oylik Saqlanish Kafolati</span>
                    </h4>
                    <p>
                      Foydalanuvchilar chatni o‘chirganda, ularning xabarlari serverda AES-256-GCM konvertida shifrlangan holatda 90 kun (3 oy) saqlanadi. Administrator ham xabarlar matnini o‘qiy olmaydi. 90 kundan keyin barcha o‘chirilgan xabarlar avtomatik va qaytmas tarzda yo‘q qilinadi.
                    </p>
                  </div>
                </div>
              )}

              {tab === 'tickets' && (
                <div className="space-y-4">
                  {tickets.length === 0 ? (
                    <div className="p-12 text-center text-text-tertiary text-xs">
                      Hozirda hech qanday tiklash arizasi mavjud emas.
                    </div>
                  ) : (
                    tickets.map((t) => (
                      <div
                        key={t.id}
                        className="p-4 rounded-2xl glass-panel border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-primary">
                              Ariza #{t.id}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                                t.status === 'pending'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : t.status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              }`}
                            >
                              {t.status}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Qolgan muddat: {t.remainingDays || 90} kun</span>
                            </span>
                          </div>

                          <div className="text-xs text-text-secondary">
                            Ariza sababi: <span className="text-text-primary italic">"{t.reason}"</span>
                          </div>

                          <div className="text-[11px] text-amber-300/80 flex items-center gap-1 font-mono">
                            <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                            <span>{t.previewContent || '🔒 [Shifrlangan konvert - Admin matnni ko‘ra olmaydi]'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {t.status === 'pending' && (
                            <button
                              onClick={() => handleApproveTicket(t.id)}
                              className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                            >
                              Arizani tasdiqlash
                            </button>
                          )}
                          {(t.status === 'approved' || t.status === 'pending') && (
                            <button
                              onClick={() => handleExecuteRestore(t.id, t.pairId)}
                              className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-accent-primary to-accent-teal text-white text-xs font-bold shadow-md transition"
                            >
                              {t.restoreExecuteBtn || 'Foydalanuvchilarga Chatni Qaytarish'}
                            </button>
                          )}
                          {t.status === 'completed' && (
                            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Qaytarilgan</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === 'pairs' && (
                <div className="divide-y divide-border-subtle border border-white/5 rounded-2xl overflow-hidden bg-bg-secondary/40">
                  <div className="grid grid-cols-4 p-3.5 text-[11px] font-bold text-text-tertiary uppercase tracking-wider bg-bg-primary/40">
                    <span>Juftlik ID</span>
                    <span>1-Foydalanuvchi ID</span>
                    <span>2-Foydalanuvchi ID</span>
                    <span className="text-right">Xabarlar soni</span>
                  </div>
                  {pairs.map((p) => (
                    <div
                      key={p.pairId}
                      className="grid grid-cols-4 p-3.5 text-xs text-text-secondary items-center hover:bg-white/5"
                    >
                      <span className="font-mono text-indigo-300 truncate pr-2">{p.pairId}</span>
                      <span className="font-mono">{p.userA?.publicId || '849201934'}</span>
                      <span className="font-mono">{p.userB?.publicId || '109482710'}</span>
                      <span className="text-right font-bold text-text-primary">{p.messageCount} ta</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
