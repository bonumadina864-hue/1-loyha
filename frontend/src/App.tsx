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
} from 'lucide-react';
import { api, UserSession, PairItem, MessageItem } from './services/api';
import { BiometricLockScreen } from './components/BiometricLockScreen';
import { ChatList } from './components/ChatList';
import { ChatConversation } from './components/ChatConversation';
import { AdminPanelModal } from './components/AdminPanelModal';
import { SettingsModal } from './components/SettingsModal';
import { PaywallModal } from './components/PaywallModal';

export function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [pairs, setPairs] = useState<PairItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [activePairId, setActivePairId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isSpoofingActive, setIsSpoofingActive] = useState(false);

  // Initialize with quick dev-login on startup
  useEffect(() => {
    loginAs('alice@pairly.local');
  }, []);

  const loginAs = async (email: string) => {
    try {
      const userSession = await api.devLogin(email);
      setSession(userSession);

      // Connect real-time socket
      const socket = api.connectSocket(userSession.accessToken);

      socket.on('message:new', (newMsg: any) => {
        setMessages((prev) => [
          ...prev,
          {
            id: newMsg.messageId,
            pairId: newMsg.pairId,
            senderId: newMsg.senderId,
            type: newMsg.type,
            content: newMsg.content,
            deliveredAt: new Date().toISOString(),
            readAt: null,
            createdAt: newMsg.createdAt,
          },
        ]);
        // Emit delivered receipt back
        socket.emit('message:delivered', { messageId: newMsg.messageId });
        loadPairs();
      });

      socket.on('message:read', (data: any) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId ? { ...m, readAt: data.readAt } : m,
          ),
        );
      });

      socket.on('message:reads-released', (data: any) => {
        const releasedIds = new Set(data.messages.map((m: any) => m.messageId));
        setMessages((prev) =>
          prev.map((m) =>
            releasedIds.has(m.id) ? { ...m, readAt: new Date().toISOString() } : m,
          ),
        );
      });

      socket.on('pair:request:new', () => {
        loadPendingRequests();
      });

      loadPairs();
      loadPendingRequests();
    } catch (err: any) {
      console.error('Login error:', err);
    }
  };

  const loadPairs = async () => {
    try {
      let list = await api.getPairs();
      if (!list || list.length === 0) {
        // Auto-seed active demo pair so the user immediately sees the chat UI
        const isAlice = session?.email?.includes('alice') ?? true;
        const partnerName = isAlice ? 'Bob' : 'Alice';
        const partnerPublicId = isAlice ? '0T7V2W1BOB' : '0T7V2W1ALC';
        const demoPair: PairItem = {
          pairId: 'demo-pair-alice-bob',
          partnerId: isAlice ? 'bob-id' : 'alice-id',
          partnerPublicId: partnerPublicId,
          partnerNickname: partnerName,
          partnerAvatarUrl: null,
          unreadCount: 0,
          lastActivity: new Date().toISOString(),
          status: 'active',
        };
        list = [demoPair];
      }
      setPairs(list);
      if (list.length > 0 && !activePairId) {
        setActivePairId(list[0].pairId);
      }
    } catch {
      // Graceful fallback
    }
  };

  const loadPendingRequests = async () => {
    try {
      const reqs = await api.getPendingRequests();
      setPendingRequests(reqs);
    } catch {
      // Graceful fallback
    }
  };

  // Load messages whenever active pair changes
  useEffect(() => {
    if (activePairId) {
      if (activePairId === 'demo-pair-alice-bob') {
        const isAlice = session?.email?.includes('alice') ?? true;
        const otherId = isAlice ? 'bob-id' : 'alice-id';
        const myId = session?.userId || 'my-id';
        setMessages([
          {
            id: 'm-1',
            pairId: 'demo-pair-alice-bob',
            senderId: otherId,
            type: 'text',
            content: 'Salom! Pairly shaxsiy 1-on-1 xavfsiz chatiga xush kelibsiz 🔒',
            deliveredAt: new Date(Date.now() - 300000).toISOString(),
            readAt: new Date(Date.now() - 250000).toISOString(),
            createdAt: new Date(Date.now() - 300000).toISOString(),
          },
          {
            id: 'm-2',
            pairId: 'demo-pair-alice-bob',
            senderId: myId,
            type: 'text',
            content: 'Salom! Bu yerda barcha xabarlar AES-256-GCM konvert shifrlash bilan himoyalanganmi?',
            deliveredAt: new Date(Date.now() - 200000).toISOString(),
            readAt: new Date(Date.now() - 180000).toISOString(),
            createdAt: new Date(Date.now() - 200000).toISOString(),
          },
          {
            id: 'm-3',
            pairId: 'demo-pair-alice-bob',
            senderId: otherId,
            type: 'text',
            content: "Ha, to'g'ri! Server-Encrypted Envelope Encryption orqali shifrlangan va audit qilingan tiklash tizimiga ega.",
            deliveredAt: new Date(Date.now() - 100000).toISOString(),
            readAt: new Date(Date.now() - 80000).toISOString(),
            createdAt: new Date(Date.now() - 100000).toISOString(),
          },
        ]);
        return;
      }

      api.getMessages(activePairId).then((res) => {
        setMessages(res.messages || []);
      }).catch(() => {
        setMessages([]);
      });
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

    setMessages((prev) => [...prev, optimisticMessage]);

    if (activePairId === 'demo-pair-alice-bob') {
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, deliveredAt: new Date().toISOString(), readAt: new Date().toISOString() }
              : m,
          ),
        );
      }, 800);
      return;
    }

    const socket = api.getSocket();
    if (socket) {
      socket.emit(
        'message:send',
        {
          pairId: activePairId,
          type: 'text',
          content,
          clientTempId: tempId,
        },
        (ack: any) => {
          if (ack?.messageId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId ? { ...m, id: ack.messageId } : m,
              ),
            );
          }
        },
      );
    }
  };

  const handleReleaseReads = () => {
    if (!activePairId) return;
    const socket = api.getSocket();
    if (socket) {
      socket.emit('message:release-reads', { pairId: activePairId }, () => {
        alert('All spoofed read receipts released to partner.');
      });
    }
  };

  const activePair = pairs.find((p) => p.pairId === activePairId);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-primary text-text-primary select-none">
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
      <header className="h-14 border-b border-border-subtle bg-bg-secondary flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-accent-primary to-accent-teal flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-bold tracking-tight text-sm text-text-primary">
              Pairly
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-tertiary/70 border border-white/5 text-[11px] text-text-tertiary">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Server-Encrypted with Audited Admin Recovery</span>
          </div>
        </div>

        {/* Action Controls & Dev User Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 1-Click Dev Switcher to test 1-on-1 messaging */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-bg-tertiary/80 border border-white/5 text-xs">
            <span className="text-[10px] uppercase font-bold text-text-tertiary px-1.5 hidden sm:inline">
              Simulate:
            </span>
            <button
              onClick={() => loginAs('alice@pairly.local')}
              className={`px-2.5 py-1 rounded-lg font-medium text-xs transition ${
                session?.email === 'alice@pairly.local'
                  ? 'bg-accent-primary text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Alice
            </button>
            <button
              onClick={() => loginAs('bob@pairly.local')}
              className={`px-2.5 py-1 rounded-lg font-medium text-xs transition ${
                session?.email === 'bob@pairly.local'
                  ? 'bg-accent-primary text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Bob
            </button>
          </div>

          {/* Admin Panel Button */}
          <button
            onClick={() => setIsAdminOpen(true)}
            className="p-2 rounded-xl bg-bg-tertiary hover:bg-white/10 text-indigo-300 hover:text-white transition flex items-center gap-1.5 text-xs font-medium"
            title="Open Admin Panel"
          >
            <ShieldAlert className="w-4 h-4" />
            <span className="hidden lg:inline">Admin Panel</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-bg-tertiary hover:bg-white/10 text-text-secondary hover:text-white transition"
            title="Privacy Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Lock App Now Button */}
          <button
            onClick={() => setIsLocked(true)}
            className="p-2 rounded-xl bg-bg-tertiary hover:bg-red-500/10 text-text-secondary hover:text-red-400 transition"
            title="Lock with Biometrics"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {session && (
          <ChatList
            session={session}
            pairs={pairs}
            pendingRequests={pendingRequests}
            activePairId={activePairId}
            onSelectPair={(id) => setActivePairId(id)}
            onRefreshPairs={() => {
              loadPairs();
              loadPendingRequests();
            }}
          />
        )}

        {activePair && session ? (
          <ChatConversation
            session={session}
            pair={activePair}
            messages={messages}
            onSendMessage={handleSendMessage}
            onReleaseReads={handleReleaseReads}
            isSpoofingActive={isSpoofingActive}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-text-tertiary bg-bg-primary">
            <div className="w-16 h-16 rounded-3xl bg-bg-tertiary/60 border border-white/5 flex items-center justify-center mb-4 text-text-tertiary">
              <Shield className="w-8 h-8 text-indigo-400/50" />
            </div>
            <h3 className="text-base font-semibold text-text-secondary mb-1">
              Select or Connect a 1-on-1 Pair
            </h3>
            <p className="text-xs max-w-sm leading-relaxed">
              No message preview text is displayed in the chat list. Select a conversation to decrypt message records.
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AdminPanelModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenPaywall={() => {
          setIsSettingsOpen(false);
          setIsPaywallOpen(true);
        }}
      />

      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onSubscribe={() => {
          setIsSpoofingActive(true);
          setIsPaywallOpen(false);
          alert('Subscribed! Unread Status Spoofing and Zero-Knowledge Backups enabled.');
        }}
      />
    </div>
  );
}

export default App;
