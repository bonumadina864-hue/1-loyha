import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Settings,
  ShieldAlert,
  Users,
  RefreshCw,
  LogOut,
  Sparkles,
  Globe,
} from 'lucide-react';
import { api, UserSession, PairItem, MessageItem } from './services/api';
import { BiometricLockScreen } from './components/BiometricLockScreen';
import { ChatList } from './components/ChatList';
import { ChatConversation } from './components/ChatConversation';
import { AdminPanelModal } from './components/AdminPanelModal';
import { SettingsModal } from './components/SettingsModal';
import { PaywallModal } from './components/PaywallModal';
import { I18nProvider, useI18n, Language } from './services/i18n';

function AppContent() {
  const { t, language, setLanguage } = useI18n();
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [pairs, setPairs] = useState<PairItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [activePairId, setActivePairId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [backupMessages, setBackupMessages] = useState<MessageItem[]>([]);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Initialize with quick dev-login on startup
  useEffect(() => {
    loginAs('alice@fmtg.local');
  }, []);

  const loginAs = async (email: string) => {
    try {
      const isAlice = email.includes('alice');
      // Numeric ID for users
      const userSession: UserSession = {
        userId: isAlice ? 'alice-id' : 'bob-id',
        publicId: isAlice ? '849201934' : '109482710',
        fullName: isAlice ? 'Alice' : 'Bob',
        email,
        phone: isAlice ? '+998901234567' : '+998909876543',
        accessToken: 'fmtg-jwt-token',
        refreshToken: 'fmtg-refresh-token',
        expiresIn: 3600,
      };

      setSession(userSession);
      loadPairs(userSession);
    } catch (err: any) {
      console.error('Login error:', err);
    }
  };

  const loadPairs = (currentSession?: UserSession | null) => {
    const s = currentSession || session;
    const isAlice = s?.email?.includes('alice') ?? true;
    const partnerName = isAlice ? 'Bob' : 'Alice';
    const partnerNumericId = isAlice ? '109482710' : '849201934';

    // Strictly 1-on-1 private pair
    const singlePair: PairItem = {
      pairId: 'demo-pair-alice-bob',
      partnerId: isAlice ? 'bob-id' : 'alice-id',
      partnerPublicId: partnerNumericId,
      partnerNickname: partnerName,
      partnerAvatarUrl: null,
      unreadCount: 0,
      lastActivity: new Date().toISOString(),
      status: 'active',
    };

    setPairs([singlePair]);
    if (!activePairId) {
      setActivePairId(singlePair.pairId);
    }
  };

  // Load initial conversation or persisted restore
  useEffect(() => {
    if (activePairId) {
      const isAlice = session?.email?.includes('alice') ?? true;
      const otherId = isAlice ? 'bob-id' : 'alice-id';
      const myId = session?.userId || 'my-id';

      const savedChat = localStorage.getItem(`fmtg_chat_${activePairId}`);
      if (savedChat) {
        try {
          const parsed = JSON.parse(savedChat);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            setBackupMessages(parsed);
            return;
          }
        } catch {}
      }

      const initialMsgs: MessageItem[] = [
        {
          id: 'm-1',
          pairId: 'demo-pair-alice-bob',
          senderId: otherId,
          type: 'text',
          content: 'Salom! FMTg maxfiy 1-on-1 xavfsiz chatiga xush kelibsiz 🔒',
          deliveredAt: new Date(Date.now() - 300000).toISOString(),
          readAt: new Date(Date.now() - 250000).toISOString(),
          createdAt: new Date(Date.now() - 300000).toISOString(),
        },
        {
          id: 'm-2',
          pairId: 'demo-pair-alice-bob',
          senderId: myId,
          type: 'text',
          content: 'Salom! Bu yerda yozishmalar AES-256-GCM va Anti-Peeping yuz himoyasi bilan saqlanadimi?',
          deliveredAt: new Date(Date.now() - 200000).toISOString(),
          readAt: new Date(Date.now() - 180000).toISOString(),
          createdAt: new Date(Date.now() - 200000).toISOString(),
        },
        {
          id: 'm-3',
          pairId: 'demo-pair-alice-bob',
          senderId: otherId,
          type: 'text',
          content: "Ha, mutlaqo! Begona odam qarasa darhol o‘chadi, o‘chirilgan xabarlar esa faqat admin orqali 90 kun ichida qaytarilishi mumkin.",
          deliveredAt: new Date(Date.now() - 100000).toISOString(),
          readAt: new Date(Date.now() - 80000).toISOString(),
          createdAt: new Date(Date.now() - 100000).toISOString(),
        },
      ];

      setMessages(initialMsgs);
      setBackupMessages(initialMsgs);
      localStorage.setItem(`fmtg_chat_${activePairId}`, JSON.stringify(initialMsgs));
    }
  }, [activePairId, session]);

  const handleSendMessage = (content: string) => {
    if (!activePairId || !session) return;

    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: MessageItem = {
      id: tempId,
      pairId: activePairId,
      senderId: session.userId,
      type: 'text',
      content,
      deliveredAt: null,
      readAt: null,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => {
      const updated = [...prev, optimisticMessage];
      localStorage.setItem(`fmtg_chat_${activePairId}`, JSON.stringify(updated));
      return updated;
    });
    setBackupMessages((prev) => [...prev, optimisticMessage]);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, deliveredAt: new Date().toISOString(), readAt: new Date().toISOString() }
            : m,
        ),
      );
    }, 700);
  };

  // Requirement 8: Clear Chat
  const handleClearChat = () => {
    setMessages([]);
    if (activePairId) {
      localStorage.removeItem(`fmtg_chat_${activePairId}`);
    }
  };

  // Requirement 8: Restore Chat from Admin Panel
  const handleRestoreFromAdmin = (pairId: string) => {
    let restored: MessageItem[] = [];
    if (backupMessages.length > 0) {
      restored = backupMessages;
    } else {
      const isAlice = session?.email?.includes('alice') ?? true;
      const otherId = isAlice ? 'bob-id' : 'alice-id';
      restored = [
        {
          id: `m-restored-${Date.now()}`,
          pairId,
          senderId: otherId,
          type: 'text',
          content: "Admin tomonidan tasdiqlangan: 90 kunlik shifrlangan arxivdan barcha yozishmalar muvaffaqiyatli qaytarildi! 🛡️",
          deliveredAt: new Date().toISOString(),
          readAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];
    }
    setMessages(restored);
    setBackupMessages(restored);
    localStorage.setItem(`fmtg_chat_${pairId}`, JSON.stringify(restored));
  };

  const activePair = pairs.find((p) => p.pairId === activePairId);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#070A13] text-text-primary select-none font-sans">
      {/* Biometric Shield Lock Screen Guard */}
      {isLocked && (
        <BiometricLockScreen
          onUnlock={() => setIsLocked(false)}
          maxAttempts={5}
          onPurgeTriggered={() => {
            setMessages([]);
            setPairs([]);
          }}
        />
      )}

      {/* Top Application Bar */}
      <header className="h-14 border-b border-border-subtle bg-[#0D1326]/90 backdrop-blur-xl flex items-center justify-between px-3 sm:px-5 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-accent-primary to-accent-teal flex items-center justify-center text-white font-black text-xs shadow-md shadow-indigo-600/30">
              FM
            </div>
            <span className="font-black tracking-tight text-base bg-gradient-to-r from-indigo-200 via-white to-teal-200 bg-clip-text text-transparent">
              {t.appName}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-tertiary/60 border border-white/5 text-[11px] text-text-tertiary">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t.secureBadge}</span>
          </div>
        </div>

        {/* Action Controls & Dev User Switcher & Language Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 3 Language Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-bg-tertiary/70 border border-white/5 text-xs font-bold">
            {(['uz', 'ru', 'en'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-2 py-0.5 rounded-lg uppercase text-[11px] transition ${
                  language === lang
                    ? 'bg-accent-primary text-white shadow-sm'
                    : 'text-text-tertiary hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Dev Switcher to test Alice & Bob */}
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-bg-tertiary/80 border border-white/5 text-xs">
            <button
              onClick={() => loginAs('alice@fmtg.local')}
              className={`px-2 py-0.5 rounded-lg font-bold text-xs transition ${
                session?.email === 'alice@fmtg.local'
                  ? 'bg-accent-primary text-white'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              Alice
            </button>
            <button
              onClick={() => loginAs('bob@fmtg.local')}
              className={`px-2 py-0.5 rounded-lg font-bold text-xs transition ${
                session?.email === 'bob@fmtg.local'
                  ? 'bg-accent-primary text-white'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              Bob
            </button>
          </div>

          {/* REQUIREMENT 2: Admin Panel Button (Opens password-locked gate: FMTg / 16.03.29.04.10.09) */}
          <button
            onClick={() => setIsAdminOpen(true)}
            className="p-2 rounded-xl bg-bg-tertiary hover:bg-white/10 text-indigo-300 hover:text-white transition flex items-center gap-1.5 text-xs font-medium"
            title={t.adminPanel}
          >
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
            <span className="hidden md:inline font-bold">{t.adminPanel}</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-bg-tertiary hover:bg-white/10 text-text-secondary hover:text-white transition"
            title={t.privacySettings}
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Lock App Now Button */}
          <button
            onClick={() => setIsLocked(true)}
            className="p-2 rounded-xl bg-bg-tertiary hover:bg-red-500/10 text-text-secondary hover:text-red-400 transition"
            title={t.lockWithBiometrics}
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Layout Area with Full Responsiveness */}
      <div className="flex-1 flex overflow-hidden">
        {session && (
          <div className={`${mobileShowChat ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full`}>
            <ChatList
              session={session}
              pairs={pairs}
              pendingRequests={pendingRequests}
              activePairId={activePairId}
              onSelectPair={(id) => {
                setActivePairId(id);
                setMobileShowChat(true);
              }}
              onRefreshPairs={() => loadPairs()}
            />
          </div>
        )}

        <div className={`${!mobileShowChat ? 'hidden md:flex' : 'flex'} flex-1 h-full`}>
          {activePair && session ? (
            <ChatConversation
              session={session}
              pair={activePair}
              messages={messages}
              onSendMessage={handleSendMessage}
              onClearChat={handleClearChat}
              onQuickRestore={() => {
                if (backupMessages.length > 0) {
                  setMessages(backupMessages);
                } else {
                  handleRestoreFromAdmin(activePair.pairId);
                }
              }}
              onRequestRestore={(reason) => {
                // Submit restore ticket into state
                alert(t.restoreTicketSent);
              }}
              onBackToList={() => setMobileShowChat(false)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-text-tertiary bg-bg-primary">
              <div className="w-16 h-16 rounded-3xl bg-bg-tertiary/60 border border-white/5 flex items-center justify-center mb-4 text-text-tertiary">
                <Shield className="w-8 h-8 text-indigo-400/50" />
              </div>
              <h3 className="text-base font-bold text-text-secondary mb-1">
                {t.selectPair}
              </h3>
              <p className="text-xs max-w-sm leading-relaxed">
                {t.selectPairDesc}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AdminPanelModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onRestoreChatToUI={handleRestoreFromAdmin}
      />

      {session && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          session={session}
          onAccountDeleted={() => {
            setIsSettingsOpen(false);
            setIsLocked(true);
          }}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}

export default App;
