import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;
  private readonly memoryStore = new Map<string, { val: string; expiresAt?: number }>();

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');

    try {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // don't spam reconnect if Redis isn't running locally
      });

      // Suppress unhandled EventEmitter errors
      this.client.on('error', (err) => {
        if (!this.isConnected) {
          // Log once as warning, do not spam terminal
        }
      });

      this.client.connect().then(() => {
        this.isConnected = true;
        this.logger.log('Connected to Redis successfully.');
      }).catch(() => {
        this.logger.warn('Redis not running on localhost:6379. RedisService will operate with resilient in-memory storage.');
      });
    } catch {
      this.logger.warn('Redis client initialization skipped. Using in-memory store.');
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch {
        // Fallback to memory
      }
    }
    const item = this.memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return item.val;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        if (ttlSeconds) {
          await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch {
        // Fallback to memory
      }
    }
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.memoryStore.set(key, { val: value, expiresAt });
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
      } catch {
        // Fallback
      }
    }
    this.memoryStore.delete(key);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const res = await this.get(`blacklist:${token}`);
    return res !== null;
  }

  async blacklistToken(token: string, ttlSeconds: number): Promise<void> {
    await this.set(`blacklist:${token}`, 'revoked', ttlSeconds);
  }

  async setPresence(userId: string, ttlSeconds = 60): Promise<void> {
    await this.set(`presence:${userId}`, 'online', ttlSeconds);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const presence = await this.get(`presence:${userId}`);
    return presence === 'online';
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
  }
}
