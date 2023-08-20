/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-useless-constructor, @typescript-eslint/no-empty-function */
import { Entity } from '@observerx/database';
import { DataSource } from 'typeorm';
import type ObserverX from './connector.js';

abstract class Platform {
  protected constructor(dataSource: DataSource) {}

  public abstract readonly platformActions: Readonly<string[]>;

  public abstract invokePlatformAction(actionName: string, ...args: any[]): any | Promise<any>;

  public abstract start(...args: any[]): void;

  public abstract stop(): void;

  public abstract initialize(): void;

  static getDatabaseEntities(): Entity[] {
    return [];
  }
}

export default Platform;
