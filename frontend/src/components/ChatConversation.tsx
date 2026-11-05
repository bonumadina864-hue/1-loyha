import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Lock,
  Check,
  CheckCheck,
  Paperclip,
  Mic,
  ShieldCheck,
  Trash2,
  AlertCircle,
  Bot,
  ChevronLeft,
} from 'lucide-react';
import { MessageItem, PairItem, UserSession } from '../services/api';
import { useI18n } from '../services/i18n';
import { AntiPeepingMonitor } from './AntiPeepingMonitor';

interface ChatConversationProps {
  session: UserSession;
  pair: PairItem;
  messages: MessageItem[];
  onSendMessage: (content: string) => void;
  onClearChat?: () => void;
  onQuickRestore?: () => void;
  onRequestRestore?: (reason: string) => void;
  onBackToList?: () => void;
}

export const ChatConversation: React.FC<ChatConversationProps> = ({
  session,
  pair,
  messages,
  onSendMessage,
  onClearChat,
  onQuickRestore,
  onRequestRestore,
  onBackToList,
}) => {
  const { t } = useI18n();
  const [inputText, setInputText] = useState('');
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreReason, setRestoreReason] = useState('');
  const [ticketSentSuccess, setTicketSentSuccess] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleClearClick = () => {
    if (confirm(t.clearChatConfirm)) {
      onClearChat?.();
    }
  };

  // Called immediately when a stranger looks at the screen
  const handleStrangerWipe = () => {
    // Instant deletion of chat
    onClearChat?.();
  };

  const handleSendRestoreTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreReason.trim()) return;
    onRequestRestore?.(restoreReason);
    setTicketSentSuccess(true);
    setTimeout(() => {
      setTicketSentSuccess(false);
      setIsRestoreModalOpen(false);
      setRestoreReason('');
    }, 2000);
  };

  const partnerNumericId = pair.partnerPublicId && /^\d+$/.test(pair.partnerPublicId)
    ? pair.partnerPublicId
    : '109482710';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080C17] relative select-none">
      {/* Real-time Anti-Peeping Front Camera Monitor: Begona qarasa srazi o'chadi */}
      <AntiPeepingMonitor
        isActive={true}
        onStrangerEmergencyWipe={handleStrangerWipe}
      />

      {/* Chat Header */}
      <div className="p-3.5 sm:p-4 border-b border-border-subtle bg-[#0D1326]/80 backdrop-blur-xl flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {/* Mobile Back Button */}
          {onBackToList && (
            <button
              onClick={onBackToList}
              className="p-1.5 rounded-xl hover:bg-white/10 text-text-tertiary hover:text-white md:hidden"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-accent-primary to-accent-teal flex items-center justify-center font-black text-sm text-white shadow-md shadow-indigo-600/20">
              {pair.partnerNickname.slice(0, 2).toUpperCase()}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-bg-primary" />
          </div>

          <div>
            <div className="text-sm font-bold text-text-primary flex items-center gap-2">
              <span>{pair.partnerNickname}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono font-bold">
                ID: {partnerNumericId}
              </span>
            </div>
            <div className="text-[11px] text-text-tertiary flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>AES-256-GCM Envelope Encryption (1-on-1)</span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Clear Chat Button */}
          <button
            onClick={handleClearClick}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition flex items-center gap-1.5"
            title={t.clearChat}
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">{t.clearChat}</span>
          </button>
        </div>
      </div>

      {/* Message Feed Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3.5 transition-all duration-200">
        {/* Security Pill */}
        <div className="text-center my-2">
          <span className="inline-flex items-center gap-1.5 py-1 px-3.5 rounded-full bg-bg-secondary/60 border border-white/5 text-[10px] text-text-tertiary shadow-sm">
            <Lock className="w-3 h-3 text-indigo-400" />
            <span>FMTg Server-Encrypted Vault • Begona qaraganda avtomatik o‘chish himoyasi</span>
          </span>
        </div>

        {/* If chat has been wiped */}
        {messages.length === 0 ? (
          <div className="my-12 p-8 max-w-md mx-auto rounded-3xl bg-bg-secondary/50 border border-white/5 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-text-primary">
              Yozishmalar tozalangan / Begona qaragani uchun o‘chirilgan
            </h4>
            <p className="text-xs text-text-tertiary leading-relaxed">
              {t.retentionInfo}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {onQuickRestore && (
                <button
                  onClick={onQuickRestore}
                  className="py-2.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <span>Chatni Qayta Tiklash (Siz uchun)</span>
                </button>
              )}
              <button
                onClick={() => setIsRestoreModalOpen(true)}
                className="py-2.5 px-5 rounded-2xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white font-bold text-xs border border-white/10 transition flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Bot className="w-4 h-4 text-indigo-400" />
                <span>{t.requestRestoreBtn}</span>
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === session.userId;
            return (
              <div
                key={msg.id || index}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[70%] ${
                  isMe ? 'ml-auto' : 'mr-auto'
                }`}
              >
                <div
                  className={`py-2.5 px-4 text-xs sm:text-sm leading-relaxed ${
                    isMe
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl rounded-tr-sm shadow-md shadow-indigo-900/20'
                      : 'bg-[#151C30] text-text-primary rounded-2xl rounded-tl-sm border border-white/5 shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>

                {/* Timestamp & read receipts */}
                <div
                  className={`flex items-center gap-1 text-[10px] text-text-tertiary mt-1 px-1 ${
                    isMe ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isMe && (
                    <span>
                      {msg.readAt ? (
                        <CheckCheck className="w-3.5 h-3.5 text-teal-400" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-text-tertiary" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="p-3 sm:p-4 border-t border-border-subtle bg-[#0D1326]/80 backdrop-blur-xl flex items-center gap-2"
      >
        <button
          type="button"
          className="p-2.5 rounded-xl hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition"
          title="Fayl biriktirish"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t.typeMessagePlaceholder}
          className="flex-1 bg-bg-tertiary/70 border border-white/10 rounded-2xl py-3 px-4 text-xs sm:text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary"
        />

        <button
          type="button"
          className="p-2.5 rounded-xl hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition"
          title="Ovozli xabar"
        >
          <Mic className="w-4 h-4" />
        </button>

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-3 rounded-2xl bg-gradient-to-r from-accent-primary to-accent-teal text-white shadow-lg shadow-indigo-600/30 hover:opacity-95 disabled:opacity-40 transition active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* RESTORATION TICKET MODAL */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="glass-modal max-w-md w-full p-6 rounded-3xl border border-white/10 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  {t.requestRestoreBtn}
                </h3>
                <p className="text-[11px] text-text-tertiary">
                  Admin panelga tiklash arizasi yuboriladi
                </p>
              </div>
            </div>

            {ticketSentSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold text-center">
                {t.restoreTicketSent}
              </div>
            ) : (
              <form onSubmit={handleSendRestoreTicket} className="space-y-3">
                <p className="text-xs text-text-secondary leading-relaxed">
                  Begona odam qaraganda yoki tozalanganda o‘chgan xabarlaringiz 90 kun serverda shifrlangan saqlanadi. Admin arizani tasdiqlagach, chat qaytariladi.
                </p>
                <textarea
                  value={restoreReason}
                  onChange={(e) => setRestoreReason(e.target.value)}
                  placeholder="Ariza sababi (masalan: Ekranga begona odam qarab qolib chat o‘chib ketdi, qaytarib bering)..."
                  className="w-full h-24 bg-bg-tertiary border border-white/10 rounded-2xl p-3 text-xs text-text-primary focus:outline-none focus:border-accent-primary resize-none"
                  required
                />
                <div className="flex items-center gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRestoreModalOpen(false)}
                    className="py-2 px-4 rounded-xl text-xs text-text-tertiary hover:text-white"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-accent-primary to-accent-teal text-white font-bold text-xs shadow-md"
                  >
                    Arizani Yuborish
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
