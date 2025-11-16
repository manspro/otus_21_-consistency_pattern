import { Controller, Post, Get, Body, Param, ValidationPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return this.userService.createUser(createUserDto);
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.userService.getUser(id);
  }

  @Get()
  async getAllUsers() {
    return this.userService.getAllUsers();
  }
}
