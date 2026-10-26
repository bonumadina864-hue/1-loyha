import { io, Socket } from 'socket.io-client';

const API_BASE = 'http://localhost:3000';

export interface UserSession {
  userId: string;
  publicId: string;
  accessToken: string;
  refreshToken: string;
  fullName: string;
  email: string;
}

export interface PairItem {
  pairId: string;
  partnerId: string;
  partnerPublicId: string;
  partnerNickname: string;
  partnerAvatarUrl: string | null;
  unreadCount: number;
  lastActivity: string;
  status: 'active' | 'unpaired' | 'blocked';
}

export interface MessageItem {
  id: string;
  pairId: string;
  senderId: string;
  type: 'text' | 'image' | 'voice' | 'file';
  content: string;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

class ApiService {
  private token: string | null = null;
  private socket: Socket | null = null;

  setToken(token: string) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      const errMsg = data?.error?.message || `Request failed with status ${res.status}`;
      throw new Error(errMsg);
    }

    return data.data as T;
  }

  // --- Auth ---
  async devLogin(email: string): Promise<UserSession> {
    const res = await this.request<{
      accessToken: string;
      refreshToken: string;
      userId: string;
      publicId: string;
    }>('/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    this.token = res.accessToken;
    return {
      ...res,
      fullName: email.split('@')[0].toUpperCase(),
      email,
    };
  }

  // --- Pairing ---
  async getPairs(): Promise<PairItem[]> {
    return this.request<PairItem[]>('/pairs');
  }

  async lookupPublicId(publicId: string): Promise<{ publicId: string; fullName: string; avatarUrl: string | null }> {
    return this.request(`/pairs/lookup/${publicId}`);
  }

  async sendPairRequest(toPublicId: string): Promise<{ requestId: string }> {
    return this.request('/pairs/request', {
      method: 'POST',
      body: JSON.stringify({ toPublicId }),
    });
  }

  async getPendingRequests(): Promise<any[]> {
    return this.request('/pairs/requests/pending');
  }

  async acceptRequest(requestId: string, nickname?: string): Promise<{ pairId: string }> {
    return this.request(`/pairs/requests/${requestId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ nickname }),
    });
  }

  async declineRequest(requestId: string): Promise<void> {
    return this.request(`/pairs/requests/${requestId}/decline`, {
      method: 'POST',
    });
  }

  // --- Messages ---
  async getMessages(pairId: string): Promise<{ messages: MessageItem[]; hasMore: boolean }> {
    return this.request(`/messages/${pairId}?limit=50`);
  }

  // --- Settings ---
  async getSettings(): Promise<any> {
    return this.request('/settings');
  }

  async updateSettings(settings: any): Promise<any> {
    return this.request('/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  // --- Admin ---
  async getAdminDashboard(): Promise<any> {
    return this.request('/admin/dashboard');
  }

  async getAdminPairs(): Promise<any> {
    return this.request('/admin/pairs');
  }

  async getAdminTickets(): Promise<any> {
    return this.request('/admin/tickets');
  }

  async createRestorationTicket(pairId: string, reason: string): Promise<any> {
    return this.request('/restoration/tickets', {
      method: 'POST',
      body: JSON.stringify({ pairId, reason }),
    });
  }

  async getUserTickets(): Promise<any[]> {
    return this.request('/restoration/tickets');
  }

  // --- Socket.io Real-time connection ---
  connectSocket(token: string): Socket {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(`${API_BASE}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const api = new ApiService();
