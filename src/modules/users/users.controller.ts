import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { sanitizeUser } from '../../common/utils/auth.utils';
import { UsersService } from './users.service';

@ApiTags('users')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users (admin only)' })
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map((user) => sanitizeUser(user));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id (admin only)' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return sanitizeUser(user);
  }
}
