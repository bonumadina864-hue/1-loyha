import React, { useState } from 'react';
import {
  UserPlus,
  Copy,
  Check,
  Shield,
  Clock,
  Sparkles,
  Search,
  UserCheck,
  X,
} from 'lucide-react';
import { PairItem, UserSession, api } from '../services/api';

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
  const [copied, setCopied] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);
  const [targetPublicId, setTargetPublicId] = useState('');
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  const copyPublicId = () => {
    navigator.clipboard.writeText(session.publicId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPublicId || targetPublicId.length !== 10) {
      setErrorMessage('Public ID must be exactly 10 characters Crockford Base32');
      return;
    }
    setIsSearching(true);
    setErrorMessage(null);
    try {
      const result = await api.lookupPublicId(targetPublicId.trim().toUpperCase());
      setLookupResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'User not found or lookup rate-limited');
      setLookupResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async () => {
    try {
      await api.sendPairRequest(targetPublicId.trim().toUpperCase());
      setRequestSent(true);
      setTimeout(() => {
        setShowPairModal(false);
        setRequestSent(false);
        setLookupResult(null);
        setTargetPublicId('');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send pair request');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await api.acceptRequest(requestId);
      onRefreshPairs();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await api.declineRequest(requestId);
      onRefreshPairs();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="w-80 md:w-96 flex flex-col h-full bg-bg-secondary border-r border-border-subtle shrink-0">
      {/* User Public ID & Profile Card */}
      <div className="p-4 border-b border-border-subtle bg-bg-primary/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent-primary to-accent-teal flex items-center justify-center font-bold text-sm text-white shadow-md">
              {session.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold text-text-primary leading-tight">
                {session.fullName}
              </div>
              <div className="text-xs text-emerald-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Encrypted & Online</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowPairModal(true)}
            className="p-2 rounded-xl bg-accent-primary/10 hover:bg-accent-primary/20 text-indigo-400 hover:text-indigo-300 transition"
            title="Connect New 1-on-1 Pair"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Public ID Badge */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-bg-tertiary/70 border border-white/5 text-xs">
          <div>
            <div className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">
              Your Public ID
            </div>
            <div className="font-mono font-bold tracking-widest text-indigo-300">
              {session.publicId}
            </div>
          </div>
          <button
            onClick={copyPublicId}
            className="p-1.5 rounded-lg hover:bg-white/5 text-text-secondary hover:text-white transition flex items-center gap-1 text-[11px]"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pending Pair Requests Section */}
      {pendingRequests.length > 0 && (
        <div className="p-3 bg-indigo-950/30 border-b border-indigo-500/20">
          <div className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pending Requests ({pendingRequests.length})</span>
          </div>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div
                key={req.requestId}
                className="p-2.5 rounded-xl bg-bg-secondary border border-indigo-500/30 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-medium text-text-primary">
                    {req.fromUser?.fullName || 'Anonymous User'}
                  </div>
                  <div className="text-[10px] text-text-tertiary font-mono">
                    ID: {req.fromUser?.publicId}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAcceptRequest(req.requestId)}
                    className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400"
                    title="Accept"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(req.requestId)}
                    className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400"
                    title="Decline"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active 1-on-1 Conversations (Strict privacy: avatar, nickname, unread count, timestamp ONLY. NEVER show preview text) */}
      <div className="flex-1 overflow-y-auto divide-y divide-border-subtle">
        {pairs.length === 0 ? (
          <div className="p-8 text-center text-text-tertiary">
            <Shield className="w-10 h-10 mx-auto mb-3 text-text-tertiary/40" />
            <div className="text-sm font-medium text-text-secondary mb-1">No Active Pairs</div>
            <p className="text-xs max-w-xs mx-auto leading-relaxed">
              Pairly is strictly 1-on-1. Tap <strong className="text-text-primary">+</strong> above to share your Public ID or connect with a partner.
            </p>
          </div>
        ) : (
          pairs.map((pair) => {
            const isActive = pair.pairId === activePairId;
            return (
              <button
                key={pair.pairId}
                onClick={() => onSelectPair(pair.pairId)}
                className={`w-full p-4 flex items-center justify-between text-left transition ${
                  isActive
                    ? 'bg-accent-subtle border-l-4 border-accent-primary'
                    : 'hover:bg-bg-tertiary/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-2xl bg-bg-tertiary flex items-center justify-center font-semibold text-sm text-text-primary border border-white/10">
                      {pair.partnerNickname.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-bg-secondary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-text-primary truncate">
                      {pair.partnerNickname}
                    </div>
                    <div className="text-[11px] text-text-tertiary font-mono">
                      {pair.partnerPublicId}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="text-[11px] text-text-tertiary flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(pair.lastActivity).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {pair.unreadCount > 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-accent-primary text-[11px] font-bold text-white flex items-center justify-center shadow-md shadow-indigo-500/30">
                      {pair.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* New Pair Connection Modal */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-modal max-w-sm w-full p-6 rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-accent-primary" />
                <span>Connect 1-on-1 Pair</span>
              </h3>
              <button
                onClick={() => setShowPairModal(false)}
                className="p-1 rounded-lg text-text-tertiary hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-secondary mb-4 leading-relaxed">
              Enter your partner's 10-character Crockford Public ID. No user directory or public search exists.
            </p>

            <form onSubmit={handleLookup} className="space-y-3 mb-4">
              <div className="relative">
                <input
                  type="text"
                  maxLength={10}
                  value={targetPublicId}
                  onChange={(e) => setTargetPublicId(e.target.value.toUpperCase())}
                  placeholder="e.g. 7M3K8D2NPW"
                  className="w-full bg-bg-tertiary/70 border border-white/10 rounded-xl py-2.5 pl-3 pr-10 text-xs font-mono tracking-widest text-text-primary uppercase focus:outline-none focus:border-accent-primary"
                />
                <button
                  type="submit"
                  disabled={isSearching || targetPublicId.length !== 10}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-accent-primary text-white disabled:opacity-40"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {errorMessage && (
              <div className="p-2.5 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            {lookupResult && (
              <div className="p-3 mb-4 rounded-xl bg-bg-tertiary/80 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-text-primary">
                    {lookupResult.fullName}
                  </div>
                  <div className="text-[11px] font-mono text-indigo-300">
                    ID: {lookupResult.publicId}
                  </div>
                </div>
                <button
                  onClick={handleSendRequest}
                  disabled={requestSent}
                  className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-accent-primary to-accent-teal text-white text-xs font-medium"
                >
                  {requestSent ? 'Request Sent!' : 'Send Request'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
