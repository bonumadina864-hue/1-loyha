import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Lock,
  Check,
  CheckCheck,
  EyeOff,
  Sparkles,
  Paperclip,
  Mic,
  ShieldCheck,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { MessageItem, PairItem, UserSession, api } from '../services/api';

interface ChatConversationProps {
  session: UserSession;
  pair: PairItem;
  messages: MessageItem[];
  onSendMessage: (content: string) => void;
  onReleaseReads?: () => void;
  isSpoofingActive?: boolean;
}

export const ChatConversation: React.FC<ChatConversationProps> = ({
  session,
  pair,
  messages,
  onSendMessage,
  onReleaseReads,
  isSpoofingActive = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
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

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-primary relative">
      {/* Chat Header */}
      <div className="p-4 border-b border-border-subtle bg-bg-secondary/70 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-accent-primary to-accent-teal flex items-center justify-center font-bold text-sm text-white shadow-md">
            {pair.partnerNickname.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-bold text-text-primary flex items-center gap-2">
              <span>{pair.partnerNickname}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                {pair.partnerPublicId}
              </span>
            </div>
            <div className="text-xs text-text-tertiary flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>AES-256-GCM Envelope Encrypted</span>
            </div>
          </div>
        </div>

        {/* Security Info Badge */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-text-tertiary px-3 py-1.5 rounded-xl bg-bg-tertiary/60 border border-white/5">
          <Lock className="w-3.5 h-3.5 text-teal-400" />
          <span>Server-Encrypted Archive</span>
        </div>
      </div>

      {/* Premium Unread Status Spoofing Notice Bar */}
      {isSpoofingActive && (
        <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border-b border-indigo-500/20 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-indigo-300">
            <EyeOff className="w-4 h-4 text-accent-teal" />
            <span>
              <strong>Unread Status Spoofing Active:</strong> Partner sees your messages as unread until you reply or release receipts.
            </span>
          </div>
          {onReleaseReads && (
            <button
              onClick={onReleaseReads}
              className="py-1 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] transition shadow-sm"
            >
              Release Read Receipts Now
            </button>
          )}
        </div>
      )}

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {/* Safe notice pill */}
        <div className="text-center my-4">
          <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-bg-tertiary/70 border border-white/5 text-[11px] text-text-tertiary">
            <Lock className="w-3 h-3 text-indigo-400" />
            <span>Messages in this 1-on-1 vault are envelope-encrypted at rest and in transit</span>
          </span>
        </div>

        {messages.map((msg, index) => {
          const isMe = msg.senderId === session.userId;
          return (
            <div
              key={msg.id || index}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[70%] ${
                isMe ? 'ml-auto' : 'mr-auto'
              }`}
            >
              <div
                className={`py-2.5 px-4 text-sm leading-relaxed ${
                  isMe ? 'bubble-sent text-white' : 'bubble-received text-text-primary'
                }`}
              >
                {msg.content}
              </div>

              {/* Timestamp & Delivery status */}
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
                    ) : msg.deliveredAt ? (
                      <CheckCheck className="w-3.5 h-3.5 text-text-tertiary" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-text-tertiary" />
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="p-3 md:p-4 border-t border-border-subtle bg-bg-secondary/70 backdrop-blur-md flex items-center gap-2"
      >
        <button
          type="button"
          className="p-2.5 rounded-xl hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition"
          title="Attach encrypted media"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Write private message..."
          className="flex-1 bg-bg-tertiary/70 border border-white/10 rounded-2xl py-3 px-4 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary"
        />

        <button
          type="button"
          className="p-2.5 rounded-xl hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition"
          title="Voice message"
        >
          <Mic className="w-4 h-4" />
        </button>

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-3 rounded-2xl bg-gradient-to-r from-accent-primary to-accent-teal text-white shadow-lg shadow-indigo-600/25 hover:opacity-95 disabled:opacity-40 transition active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
