import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
  ) {}

  async createAccount(createAccountDto: CreateAccountDto): Promise<Account> {
    const existingAccount = await this.accountRepository.findOne({
      where: { userId: createAccountDto.userId },
    });

    if (existingAccount) {
      throw new BadRequestException('Account already exists for this user');
    }

    const account = this.accountRepository.create({
      userId: createAccountDto.userId,
      balance: 0,
    });

    return this.accountRepository.save(account);
  }

  async deposit(depositDto: DepositDto): Promise<Account> {
    const account = await this.accountRepository.findOne({
      where: { userId: depositDto.userId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    account.balance = Number(account.balance) + depositDto.amount;
    return this.accountRepository.save(account);
  }

  async withdraw(withdrawDto: WithdrawDto): Promise<{ success: boolean; message?: string }> {
    const account = await this.accountRepository.findOne({
      where: { userId: withdrawDto.userId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (Number(account.balance) < withdrawDto.amount) {
      return {
        success: false,
        message: 'Insufficient funds',
      };
    }

    account.balance = Number(account.balance) - withdrawDto.amount;
    await this.accountRepository.save(account);

    return {
      success: true,
    };
  }

  async getBalance(userId: string): Promise<{ userId: string; balance: number }> {
    const account = await this.accountRepository.findOne({
      where: { userId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return {
      userId: account.userId,
      balance: Number(account.balance),
    };
  }
}
