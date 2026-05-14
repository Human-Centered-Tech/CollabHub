import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email: email.toLowerCase() } });
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  async create(input: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<User> {
    const user = this.users.create({
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash: input.passwordHash,
    });
    return this.users.save(user);
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.users.update({ id: userId }, { passwordHash });
  }
}
