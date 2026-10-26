import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { RedisService } from '../redis/redis.service';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    deviceId: string;
    tier: string;
  };
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*' },
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagingGateway.name);

  constructor(
    private readonly messagingService: MessagingService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>(
          'JWT_ACCESS_SECRET',
          'pairly_super_secure_jwt_access_secret_key_2026_dev',
        ),
      });

      if (payload.type !== 'access') {
        client.disconnect();
        return;
      }

      client.data = {
        userId: payload.sub,
        deviceId: payload.deviceId,
        tier: payload.tier || 'free',
      };

      // Join user-specific notification room
      client.join(`user:${payload.sub}`);
      await this.redisService.setPresence(payload.sub, 60);

      this.logger.log(`User ${payload.sub} connected on device ${payload.deviceId}`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    if (client.data?.userId) {
      this.logger.log(`User ${client.data.userId} disconnected`);
    }
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      pairId: string;
      type: 'text' | 'image' | 'voice' | 'file';
      content: string;
      replyToId?: string;
      clientTempId: string;
    },
  ) {
    try {
      const { message, recipientId, decryptedContent } =
        await this.messagingService.sendMessage(
          client.data.userId,
          data.pairId,
          data.type || 'text',
          data.content,
          data.replyToId,
        );

      // Emit new message event to recipient's personal room
      this.server.to(`user:${recipientId}`).emit('message:new', {
        messageId: message.id,
        pairId: message.pairId,
        senderId: message.senderId,
        type: message.messageType,
        content: decryptedContent,
        replyToId: message.replyToId,
        createdAt: message.createdAt,
      });

      // Acknowledge back to sender
      return {
        messageId: message.id,
        createdAt: message.createdAt,
        clientTempId: data.clientTempId,
      };
    } catch (err: any) {
      return { error: err.message || 'Failed to send message' };
    }
  }

  @SubscribeMessage('message:delivered')
  async handleDelivered(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string },
  ) {
    const deliveredAt = await this.messagingService.markDelivered(
      data.messageId,
      client.data.userId,
    );
    return { ok: true, deliveredAt };
  }

  @SubscribeMessage('message:read')
  async handleRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string },
  ) {
    const result = await this.messagingService.markRead(
      data.messageId,
      client.data.userId,
    );

    if (result.shouldNotifySender) {
      this.server.to(`user:${result.senderId}`).emit('message:read', {
        messageId: data.messageId,
        readAt: result.readAt,
      });
    }

    return { ok: true };
  }

  @SubscribeMessage('message:release-reads')
  async handleReleaseReads(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { pairId: string },
  ) {
    const res = await this.messagingService.releaseSpoofedReads(
      client.data.userId,
      data.pairId,
    );

    if (res.releasedCount > 0) {
      this.server.to(`user:${res.partnerId}`).emit('message:reads-released', {
        pairId: data.pairId,
        messages: res.releasedReceipts,
      });
    }

    return { released: res.releasedCount };
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { pairId: string; partnerId: string },
  ) {
    if (data.partnerId) {
      this.server.to(`user:${data.partnerId}`).emit('typing:start', {
        pairId: data.pairId,
        userId: client.data.userId,
      });
    }
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { pairId: string; partnerId: string },
  ) {
    if (data.partnerId) {
      this.server.to(`user:${data.partnerId}`).emit('typing:stop', {
        pairId: data.pairId,
        userId: client.data.userId,
      });
    }
  }

  @SubscribeMessage('presence:ping')
  async handlePresencePing(@ConnectedSocket() client: AuthenticatedSocket) {
    await this.redisService.setPresence(client.data.userId, 60);
    return { status: 'pong' };
  }
}
