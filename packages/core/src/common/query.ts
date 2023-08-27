import { getDataSource } from '@observerx/database';
import { DeepPartial, FindManyOptions } from 'typeorm';
import User from '../entities/User.js';

export interface GetUsersParameters {
  take: number;
  skip?: number;
}

export async function getUsers({
  take,
  skip = 0,
  ...options
}: GetUsersParameters & FindManyOptions<User>): Promise<{ users: User[]; total: number }> {
  const dataSource = getDataSource();
  const userRepository = dataSource.getRepository(User);
  const [users, total] = await userRepository.findAndCount({
    take,
    skip,
    ...options,
  });
  return { users, total };
}

export async function getUser(userId: string): Promise<User> {
  const dataSource = getDataSource();
  const userRepository = dataSource.getRepository(User);
  return userRepository.findOneBy({ id: userId });
}

export async function updateUser(partialUser: DeepPartial<User> & { id: string }) {
  const dataSource = getDataSource();
  const userRepository = dataSource.getRepository(User);
  const user = await userRepository.findOneBy({ id: partialUser.id });
  if (!user) {
    throw new Error('User not found.');
  }
  return userRepository.save({
    ...user,
    ...partialUser,
  });
}

export async function createUser(partialUser: DeepPartial<User>): Promise<User> {
  const dataSource = getDataSource();
  const userRepository = dataSource.getRepository(User);
  const user = userRepository.create(partialUser);
  await userRepository.save(user);
  return user;
}
