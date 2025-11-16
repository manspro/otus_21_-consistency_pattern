import { IsString, IsNotEmpty, IsNumber, Min, IsEmail } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNumber()
  @Min(0.01)
  price: number;
}
