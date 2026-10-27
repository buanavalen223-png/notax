/**
 * Local IndexedDB Database Definition using Dexie.
 *
 * Source of truth: ARCHITECTURE.md §3 & PRD.md §5.1, §5.2, §6.
 * - Stores `transactions`, `categories`, `settings` (v1), and `budgets` (v2 — P1 Monthly Budgets).
 * - Never creates `users`, `profiles`, `bankAccounts`, `wallets`, `cards`, or `transfers`.
 * - Presentation components must NOT import or query `NotaDatabase` directly;
 *   all data operations go through `src/data/repositories/`.
 */

import Dexie, { type Table } from 'dexie';
import type { CategoryBudget } from '../domain/budget';
import type { DebtRecord } from '../domain/debtRecord';
import type { SavingsGoal } from '../domain/savingsGoal';
import type { AppSettings, Category, Transaction } from '../domain/transaction';

export const NOTA_DB_NAME = 'nota_local_db';
export const NOTA_SCHEMA_VERSION = 4;
export const PRIMARY_SETTINGS_ID = 'app-settings';

export interface StoredAppSettings extends AppSettings {
  /** Singleton primary key (`'app-settings'`) in the `settings` store */
  id: string;
  /** ISO 8601 timestamp of last settings update */
  updatedAt: string;
}

export class NotaDatabase extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  settings!: Table<StoredAppSettings, string>;
  budgets!: Table<CategoryBudget, string>;
  savingsGoals!: Table<SavingsGoal, string>;
  debtRecords!: Table<DebtRecord, string>;

  constructor(databaseName: string = NOTA_DB_NAME) {
    super(databaseName);

    // Schema v1: Core MVP stores
    this.version(1).stores({
      transactions: 'id, occurredAt, type, categoryId, createdAt',
      categories: 'id, type, isDefault',
      settings: 'id',
    });

    // Schema v2: Adds P1 Monthly Category Budgets store without mutating v1 data
    this.version(2).stores({
      transactions: 'id, occurredAt, type, categoryId, createdAt',
      categories: 'id, type, isDefault',
      settings: 'id',
      budgets: 'id, &categoryId',
    });

    // Schema v3: Adds P1 Savings Goals store without mutating v1/v2 data
    this.version(3).stores({
      transactions: 'id, occurredAt, type, categoryId, createdAt',
      categories: 'id, type, isDefault',
      settings: 'id',
      budgets: 'id, &categoryId',
      savingsGoals: 'id, createdAt, targetDate',
    });

    // Schema v4: Adds P1 Debt & Receivable Tracking store without mutating v1/v2/v3 data
    this.version(NOTA_SCHEMA_VERSION).stores({
      transactions: 'id, occurredAt, type, categoryId, createdAt',
      categories: 'id, type, isDefault',
      settings: 'id',
      budgets: 'id, &categoryId',
      savingsGoals: 'id, createdAt, targetDate',
      debtRecords: 'id, direction, status, dueDate, createdAt',
    });
  }
}

export const db = new NotaDatabase();
