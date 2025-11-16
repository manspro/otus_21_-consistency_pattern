import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private billingService: BillingService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const user = this.userRepository.create(createUserDto);
    await this.userRepository.save(user);

    await this.billingService.createAccount({ userId: user.id });

    return user;
  }

  async getUser(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find();
  }
}
