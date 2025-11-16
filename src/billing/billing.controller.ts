import { Controller, Post, Get, Body, Param, ValidationPipe } from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('accounts')
  async createAccount(@Body(ValidationPipe) createAccountDto: CreateAccountDto) {
    return this.billingService.createAccount(createAccountDto);
  }

  @Post('deposit')
  async deposit(@Body(ValidationPipe) depositDto: DepositDto) {
    return this.billingService.deposit(depositDto);
  }

  @Post('withdraw')
  async withdraw(@Body(ValidationPipe) withdrawDto: WithdrawDto) {
    return this.billingService.withdraw(withdrawDto);
  }

  @Get('balance/:userId')
  async getBalance(@Param('userId') userId: string) {
    return this.billingService.getBalance(userId);
  }
}
