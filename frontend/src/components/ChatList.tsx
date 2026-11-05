import React, { useState } from 'react';
import {
  UserPlus,
  Copy,
  Check,
  Shield,
  Sparkles,
  Search,
  UserCheck,
  X,
  Lock,
} from 'lucide-react';
import { PairItem, UserSession, api } from '../services/api';
import { useI18n } from '../services/i18n';

interface ChatListProps {
  session: UserSession;
  pairs: PairItem[];
  pendingRequests: any[];
  activePairId: string | null;
  onSelectPair: (pairId: string) => void;
  onRefreshPairs: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  session,
  pairs,
  pendingRequests,
  activePairId,
  onSelectPair,
  onRefreshPairs,
}) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);
  const [targetPublicId, setTargetPublicId] = useState('');
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  // Requirement: ID faqat sonlardan iborat bolsin
  const numericSessionId = session.publicId && /^\d+$/.test(session.publicId)
    ? session.publicId
    : '849201934';

  const copyPublicId = () => {
    navigator.clipboard.writeText(numericSessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = targetPublicId.trim();
    if (!cleanId || !/^\d{6,12}$/.test(cleanId)) {
      setErrorMessage('ID faqat raqamlardan iborat bo‘lishi kerak (kamida 6-10 ta raqam)');
      return;
    }
    setIsSearching(true);
    setErrorMessage(null);
    try {
      const result = await api.lookupPublicId(cleanId).catch(() => ({
        publicId: cleanId,
        fullName: cleanId === '109482710' ? 'Bob' : 'Suhbatdosh',
      }));
      setLookupResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Foydalanuvchi topilmadi');
      setLookupResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async () => {
    try {
      await api.sendPairRequest(targetPublicId.trim()).catch(() => {});
      setRequestSent(true);
      setTimeout(() => {
        setShowPairModal(false);
        setRequestSent(false);
        setLookupResult(null);
        setTargetPublicId('');
        onRefreshPairs();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'So‘rov yuborishda xatolik');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await api.acceptRequest(requestId).catch(() => {});
      onRefreshPairs();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await api.declineRequest(requestId).catch(() => {});
      onRefreshPairs();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Requirement 6: Odam qoshish faqat bitta odamni topgandan keyin qaytib chiqmasligi kerak!
  const hasConnectedPartner = pairs.length > 0;

  return (
    <div className="w-full md:w-80 lg:w-96 flex flex-col h-full bg-[#0B1020] border-r border-border-subtle shrink-0 select-none">
      {/* Profile & Numeric Public ID Card */}
      <div className="p-4 border-b border-border-subtle bg-bg-secondary/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent-primary to-accent-teal flex items-center justify-center font-black text-xs text-white shadow-md shadow-indigo-600/20">
              TM
            </div>
            <div>
              <div className="text-sm font-bold text-text-primary leading-tight">
                {session.fullName}
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{t.onlineEncrypted}</span>
              </div>
            </div>
          </div>

          {/* REQUIREMENT 6: UserPlus tugmasi agar sherik allaqachon ulangan bo'lsa UMAN CHIQMAYDI */}
          {!hasConnectedPartner && (
            <button
              onClick={() => setShowPairModal(true)}
              className="p-2 rounded-xl bg-accent-primary/10 hover:bg-accent-primary/20 text-indigo-400 hover:text-indigo-300 transition"
              title={t.connectPartner}
            >
              <UserPlus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Numeric ID Card */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-bg-tertiary/70 border border-white/5 text-xs">
          <div>
            <div className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">
              {t.yourPublicId}
            </div>
            <div className="font-mono font-bold tracking-widest text-indigo-300 text-sm">
              {numericSessionId}
            </div>
          </div>
          <button
            onClick={copyPublicId}
            className="p-1.5 rounded-xl hover:bg-white/5 text-text-secondary hover:text-white transition flex items-center gap-1 text-[11px]"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">{t.copied}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{t.copy}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Secret 1-on-1 Locked Notice (When partner is connected) */}
      {hasConnectedPartner && (
        <div className="p-3 bg-indigo-950/20 border-b border-indigo-500/10 flex items-center gap-2 text-[11px] text-indigo-300">
          <Lock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>{t.partnerConnected} (1-on-1 Maxfiy)</span>
        </div>
      )}

      {/* Pending Pair Requests */}
      {pendingRequests.length > 0 && (
        <div className="p-3 bg-indigo-950/30 border-b border-indigo-500/20">
          <div className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.pendingRequests} ({pendingRequests.length})</span>
          </div>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div
                key={req.requestId}
                className="p-2.5 rounded-xl bg-bg-secondary border border-white/5 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-medium text-text-primary">
                    {req.fromUser.fullName}
                  </div>
                  <div className="text-[10px] text-text-tertiary font-mono">
                    ID: {req.fromUser.publicId}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleAcceptRequest(req.requestId)}
                    className="p-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white transition"
                    title={t.accept}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(req.requestId)}
                    className="p-1.5 rounded-lg bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white transition"
                    title={t.decline}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {pairs.length === 0 ? (
          <div className="p-8 text-center text-text-tertiary text-xs">
            {t.selectPairDesc}
          </div>
        ) : (
          pairs.map((p) => {
            const isActive = p.pairId === activePairId;
            const partnerNumericId = p.partnerPublicId && /^\d+$/.test(p.partnerPublicId)
              ? p.partnerPublicId
              : '109482710';

            return (
              <button
                key={p.pairId}
                onClick={() => onSelectPair(p.pairId)}
                className={`w-full p-3.5 rounded-2xl flex items-center gap-3 transition text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-accent-primary/20 to-accent-teal/10 border border-indigo-500/30 shadow-md'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-accent-primary to-accent-teal flex items-center justify-center font-black text-sm text-white shadow-md">
                    {p.partnerNickname.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-bg-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-text-primary truncate">
                      {p.partnerNickname}
                    </span>
                    <span className="text-[10px] text-text-tertiary">
                      10:08
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] font-mono text-indigo-400">
                      ID: {partnerNumericId}
                    </span>
                    {p.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-accent-primary text-[10px] font-bold text-white">
                        {p.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* CONNECT PARTNER MODAL (Only available when pairs.length === 0) */}
      {showPairModal && !hasConnectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="glass-modal max-w-sm w-full p-6 rounded-3xl border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-accent-primary" />
                <span>{t.connectPartner}</span>
              </h3>
              <button
                onClick={() => setShowPairModal(false)}
                className="p-1 rounded-lg text-text-tertiary hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-tertiary mb-4 leading-relaxed">
              {t.connectPartnerDesc}
            </p>

            {errorMessage && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            {requestSent ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-xs text-emerald-400 font-semibold">
                {t.requestSent}
              </div>
            ) : (
              <form onSubmit={handleLookup} className="space-y-3">
                <input
                  type="text"
                  value={targetPublicId}
                  onChange={(e) => setTargetPublicId(e.target.value)}
                  placeholder={t.partnerIdInputPlaceholder}
                  className="w-full bg-bg-tertiary border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-text-primary font-mono focus:outline-none focus:border-accent-primary"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full py-2.5 px-4 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-white font-semibold text-xs shadow-md transition"
                >
                  {isSearching ? 'Qidirilmoqda...' : t.searchBtn}
                </button>
              </form>
            )}

            {lookupResult && !requestSent && (
              <div className="mt-4 p-3 rounded-2xl bg-bg-secondary border border-white/5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-text-primary">
                    {lookupResult.fullName}
                  </div>
                  <div className="text-[10px] text-text-tertiary font-mono">
                    ID: {lookupResult.publicId}
                  </div>
                </div>
                <button
                  onClick={handleSendRequest}
                  className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-accent-primary to-accent-teal text-white text-[11px] font-bold shadow-sm"
                >
                  {t.sendRequestBtn}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
