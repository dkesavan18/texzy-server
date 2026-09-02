import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthUser } from '../decorators/current-user.decorator';
import { CategoriesService } from '../../modules/categories/categories.service';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private readonly categoriesService: CategoriesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const isAdmin = this.categoriesService.isAdminRole(user.roleId);
    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
