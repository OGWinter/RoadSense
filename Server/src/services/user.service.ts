import { UserRepository } from '../infrastructure/repositories/user.repository';
import { UserDTO } from '../shared/types';

export class UserService {
  constructor(private userRepo: UserRepository) {}

  async listUsers(
    page = 1,
    limit = 20
  ): Promise<{ users: UserDTO[]; total: number; page: number; limit: number }> {
    return this.userRepo.findAll(page, limit);
  }
}
