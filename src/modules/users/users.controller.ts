import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { sanitizeUser } from '../../common/utils/auth.utils';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users (sanitized)' })
  async findAll() {
    const users = await this.usersService.findAll();
    return users.map((user) => sanitizeUser(user));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id (sanitized)' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return sanitizeUser(user);
  }
}
