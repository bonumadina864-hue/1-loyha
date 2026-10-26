import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../../../database/entities/subscription.entity';

@Injectable()
export class RequirePremiumGuard implements CanActivate {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.sub) {
      throw new ForbiddenException('User session required');
    }

    const sub = await this.subscriptionRepository.findOne({
      where: { userId: user.sub },
    });

    if (!sub || sub.tier !== 'premium') {
      throw new ForbiddenException(
        'This feature requires an active Pairly Premium subscription',
      );
    }

    const now = new Date();

    // Check if active or within grace period
    if (sub.status === 'active') {
      if (sub.expiresAt && sub.expiresAt < now) {
        if (sub.gracePeriodEndsAt && sub.gracePeriodEndsAt > now) {
          return true; // In grace period
        }
        throw new ForbiddenException(
          'Your premium subscription has expired. Please renew to continue.',
        );
      }
      return true;
    }

    if (sub.status === 'grace_period' && sub.gracePeriodEndsAt && sub.gracePeriodEndsAt > now) {
      return true;
    }

    throw new ForbiddenException('Active premium subscription required');
  }
}
