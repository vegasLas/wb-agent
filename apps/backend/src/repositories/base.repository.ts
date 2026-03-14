import { PrismaClient } from '@prisma/client';

export interface FindManyParams {
  where?: Record<string, unknown>;
  skip?: number;
  take?: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
  include?: Record<string, boolean>;
}

export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  constructor(protected prisma: PrismaClient) {}

  abstract findById(id: string): Promise<T | null>;
  abstract findMany(params: FindManyParams): Promise<T[]>;
  abstract create(data: CreateInput): Promise<T>;
  abstract update(id: string, data: UpdateInput): Promise<T>;
  abstract delete(id: string): Promise<void>;
}
