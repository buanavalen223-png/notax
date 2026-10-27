/**
 * Repository & Data-Access Layer for Nota's Local IndexedDB Storage.
 *
 * Source of truth: ARCHITECTURE.md §3, §4 & PRD.md §5.1, §6, §7.
 *
 * Responsibilities:
 * - Encapsulate all Dexie/IndexedDB reads and writes behind a clean, testable API.
 * - Seed only `DEFAULT_CATEGORIES` and `DEFAULT_APP_SETTINGS` on initialization (never fake transactions).
 * - Delegate all validation and financial calculations to the tested domain functions in `src/domain/`.
 * - Surface storage read/write failures via explicit `NotaStorageError` so the UI never pretends failed writes succeeded.
 */

import { type DateRangePeriod, getCurrentMonthPeriod } from '../../lib/date';
import {
  type CategoryBudget,
  type CategoryBudgetInput,
  createCategoryBudget,
} from '../../domain/budget';
import {
  type DebtRecord,
  type DebtRecordInput,
  type DebtRecordPatch,
  applyDebtRecordEdit,
  createDebtRecord,
  settleDebtRecord,
} from '../../domain/debtRecord';
import {
  type SavingsGoal,
  type SavingsGoalInput,
  type SavingsGoalPatch,
  applySavingsGoalEdit,
  createSavingsGoal,
} from '../../domain/savingsGoal';
import {
  type OverviewSnapshot,
  calculateOverviewSnapshot,
  sortTransactions,
} from '../../domain/summaries';
import {
  type AppSettings,
  type Category,
  type CategoryInput,
  DEFAULT_APP_SETTINGS,
  DEFAULT_CATEGORIES,
  type Transaction,
  type TransactionDraft,
  type TransactionPatch,
  applyTransactionEdit,
  archiveCategory,
  createCategory,
  createTransaction,
  renameCategory,
} from '../../domain/transaction';
import { validateAppSettings } from '../../domain/validation';
import {
  type NotaBackupPayload,
  type NotaBackupPreview,
  createBackupPayload,
  parseAndValidateBackupJson,
  validateBackupObject,
} from '../backup/notaBackup';
import {
  NotaDatabase,
  PRIMARY_SETTINGS_ID,
  type StoredAppSettings,
  db as defaultDb,
} from '../db';

export class NotaStorageError extends Error {
  readonly causeError?: unknown;

  constructor(message: string, causeError?: unknown) {
    super(message);
    this.name = 'NotaStorageError';
    this.causeError = causeError;
  }
}

export interface LocalWorkspaceState {
  settings: AppSettings;
  categories: Category[];
  transactions: Transaction[];
  budgets: CategoryBudget[];
  savingsGoals: SavingsGoal[];
  debtRecords: DebtRecord[];
  overview: OverviewSnapshot;
}

export interface NotaRepository {
  /** Ensures default settings and default Indonesian categories exist in IndexedDB (never seeds fake transactions). */
  initialize(): Promise<{ settings: AppSettings; categories: Category[] }>;
  /** Reads the current `AppSettings` (initializing defaults if empty). */
  getSettings(): Promise<AppSettings>;
  /** Completes first-run setup or updates the opening balance in integer IDR (`>= 0`). Never creates a transaction. */
  saveOpeningBalance(
    openingBalance: number,
    options?: { completeOnboarding?: boolean; nowIso?: string },
  ): Promise<AppSettings>;
  /** Returns all categories (both default and custom, including archived for historical lookups). */
  getCategories(): Promise<Category[]>;
  /** Adds a new custom category after domain validation. */
  addCategory(input: CategoryInput): Promise<Category>;
  /** Renames an existing category while preserving its ID for historical transactions. */
  updateCategoryName(categoryId: string, newName: string): Promise<Category>;
  /** Archives a category without deleting it so existing transactions retain its name. */
  archiveCategoryById(
    categoryId: string,
    archivedAtIso?: string,
  ): Promise<Category>;
  /** Returns all stored transactions sorted newest-first. */
  getTransactions(): Promise<Transaction[]>;
  /** Persists a new validated transaction (`income` or `expense`). */
  addTransaction(draft: TransactionDraft): Promise<Transaction>;
  /** Updates an existing transaction in-place without duplicating records. */
  updateTransaction(
    transactionId: string,
    patch: TransactionPatch,
    updatedAtIso?: string,
  ): Promise<Transaction>;
  /** Deletes a transaction by ID. */
  deleteTransaction(transactionId: string): Promise<void>;
  /** Returns all configured monthly category budgets. */
  getBudgets(): Promise<CategoryBudget[]>;
  /** Creates or updates a monthly budget limit (`> 0` IDR) for an expense category. Never creates a transaction or alters balance. */
  saveCategoryBudget(input: CategoryBudgetInput): Promise<CategoryBudget>;
  /** Deletes a monthly category budget by `categoryId`. */
  deleteCategoryBudget(categoryId: string): Promise<void>;
  /** Returns all configured savings goals sorted newest-first. */
  getSavingsGoals(): Promise<SavingsGoal[]>;
  /** Creates a new savings goal (`targetAmount > 0`, `allocatedAmount >= 0`). Never creates a transaction or alters balance. */
  addSavingsGoal(input: SavingsGoalInput): Promise<SavingsGoal>;
  /** Updates an existing savings goal in-place. Never creates a transaction or alters balance. */
  updateSavingsGoal(
    goalId: string,
    patch: SavingsGoalPatch,
    updatedAtIso?: string,
  ): Promise<SavingsGoal>;
  /** Deletes a savings goal by ID. */
  deleteSavingsGoal(goalId: string): Promise<void>;
  /** Returns all stored debt and receivable records sorted newest-first. */
  getDebtRecords(): Promise<DebtRecord[]>;
  /** Creates a new debt/receivable record (`payable` or `receivable`). Never alters cash balance. */
  addDebtRecord(input: DebtRecordInput): Promise<DebtRecord>;
  /** Updates an existing debt/receivable record in-place. Never alters cash balance. */
  updateDebtRecord(
    debtId: string,
    patch: DebtRecordPatch,
    updatedAtIso?: string,
  ): Promise<DebtRecord>;
  /** Marks a debt/receivable record as settled (`remainingAmount = 0`, `status = 'settled'`). */
  settleDebtRecordById(
    debtId: string,
    updatedAtIso?: string,
  ): Promise<DebtRecord>;
  /** Deletes a debt/receivable record by ID. */
  deleteDebtRecord(debtId: string): Promise<void>;
  /** Loads settings, categories, transactions, budgets, savingsGoals, debtRecords, and the computed `OverviewSnapshot` for a period. */
  loadWorkspaceState(period?: DateRangePeriod): Promise<LocalWorkspaceState>;
  /** Exports all persisted local records into a versioned `NotaBackupPayload`. */
  exportBackup(exportedAt?: string): Promise<NotaBackupPayload>;
  /** Validates a backup JSON string or object and atomically replaces local data inside a single transaction. */
  restoreBackup(rawJsonOrPayload: string | unknown): Promise<NotaBackupPreview>;
}

function toDomainSettings(stored: StoredAppSettings): AppSettings {
  return {
    openingBalance: stored.openingBalance,
    currency: stored.currency,
    onboardingCompleted: stored.onboardingCompleted,
  };
}

export function createNotaRepository(
  database: NotaDatabase = defaultDb,
): NotaRepository {
  async function initialize(): Promise<{
    settings: AppSettings;
    categories: Category[];
  }> {
    try {
      return await database.transaction(
        'rw',
        database.settings,
        database.categories,
        async () => {
          let storedSettings = await database.settings.get(PRIMARY_SETTINGS_ID);

          if (!storedSettings) {
            storedSettings = {
              id: PRIMARY_SETTINGS_ID,
              ...DEFAULT_APP_SETTINGS,
              updatedAt: new Date().toISOString(),
            };
            await database.settings.put(storedSettings);
          } else {
            const validation = validateAppSettings(storedSettings);
            if (!validation.valid) {
              throw new NotaStorageError(
                `Data pengaturan lokal tidak valid: ${validation.errors[0]}`,
              );
            }
          }

          const existingCategories = await database.categories.toArray();
          if (existingCategories.length === 0) {
            const seedCategories: Category[] = DEFAULT_CATEGORIES.map((cat) => ({
              ...cat,
            }));
            await database.categories.bulkPut(seedCategories);
            return {
              settings: toDomainSettings(storedSettings),
              categories: seedCategories,
            };
          }

          // Ensure any missing default categories are present without overwriting user renames/archives
          const existingIds = new Set(existingCategories.map((c) => c.id));
          const missingDefaults = DEFAULT_CATEGORIES.filter(
            (c) => !existingIds.has(c.id),
          ).map((c) => ({ ...c }));

          if (missingDefaults.length > 0) {
            await database.categories.bulkPut(missingDefaults);
          }

          const allCategories =
            missingDefaults.length > 0
              ? await database.categories.toArray()
              : existingCategories;

          return {
            settings: toDomainSettings(storedSettings),
            categories: allCategories,
          };
        },
      );
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      throw new NotaStorageError(
        'Gagal menyiapkan penyimpanan lokal di browser. Pastikan penyimpanan situs (IndexedDB) tidak diblokir.',
        error,
      );
    }
  }

  async function getSettings(): Promise<AppSettings> {
    try {
      const stored = await database.settings.get(PRIMARY_SETTINGS_ID);
      if (!stored) {
        const initialized = await initialize();
        return initialized.settings;
      }
      const validation = validateAppSettings(stored);
      if (!validation.valid) {
        throw new NotaStorageError(
          `Data pengaturan lokal tidak valid: ${validation.errors[0]}`,
        );
      }
      return toDomainSettings(stored);
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      throw new NotaStorageError(
        'Gagal membaca pengaturan dari penyimpanan lokal.',
        error,
      );
    }
  }

  async function saveOpeningBalance(
    openingBalance: number,
    options?: { completeOnboarding?: boolean; nowIso?: string },
  ): Promise<AppSettings> {
    const candidateSettings: AppSettings = {
      openingBalance,
      currency: 'IDR',
      onboardingCompleted: options?.completeOnboarding ?? true,
    };

    const validation = validateAppSettings(candidateSettings);
    if (!validation.valid) {
      throw new NotaStorageError(validation.errors[0]);
    }

    try {
      const updatedRecord: StoredAppSettings = {
        id: PRIMARY_SETTINGS_ID,
        ...candidateSettings,
        updatedAt: options?.nowIso ?? new Date().toISOString(),
      };
      await database.settings.put(updatedRecord);
      return toDomainSettings(updatedRecord);
    } catch (error) {
      throw new NotaStorageError(
        'Gagal menyimpan saldo awal ke penyimpanan lokal perangkat.',
        error,
      );
    }
  }

  async function getCategories(): Promise<Category[]> {
    try {
      const existing = await database.categories.toArray();
      if (existing.length === 0) {
        const initialized = await initialize();
        return initialized.categories;
      }
      return existing;
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      throw new NotaStorageError(
        'Gagal memuat daftar kategori dari penyimpanan lokal.',
        error,
      );
    }
  }

  async function addCategory(input: CategoryInput): Promise<Category> {
    let category: Category;
    try {
      category = createCategory(input);
    } catch (validationError) {
      throw new NotaStorageError(
        validationError instanceof Error
          ? validationError.message
          : 'Data kategori tidak valid.',
        validationError,
      );
    }

    try {
      return await database.transaction('rw', database.categories, async () => {
        const existing = await database.categories.get(category.id);
        if (existing) {
          throw new NotaStorageError(
            `Kategori dengan ID "${category.id}" sudah terdaftar.`,
          );
        }
        await database.categories.add(category);
        return category;
      });
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      throw new NotaStorageError(
        'Gagal menyimpan kategori baru ke penyimpanan lokal.',
        error,
      );
    }
  }

  async function updateCategoryName(
    categoryId: string,
    newName: string,
  ): Promise<Category> {
    try {
      return await database.transaction('rw', database.categories, async () => {
        const existing = await database.categories.get(categoryId);
        if (!existing) {
          throw new NotaStorageError(
            `Kategori dengan ID "${categoryId}" tidak ditemukan.`,
          );
        }
        const updated = renameCategory(existing, newName);
        await database.categories.put(updated);
        return updated;
      });
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new NotaStorageError(error.message, error);
      }
      throw new NotaStorageError(
        'Gagal memperbarui nama kategori di penyimpanan lokal.',
        error,
      );
    }
  }

  async function archiveCategoryById(
    categoryId: string,
    archivedAtIso?: string,
  ): Promise<Category> {
    try {
      return await database.transaction('rw', database.categories, async () => {
        const existing = await database.categories.get(categoryId);
        if (!existing) {
          throw new NotaStorageError(
            `Kategori dengan ID "${categoryId}" tidak ditemukan.`,
          );
        }
        const archived = archiveCategory(existing, archivedAtIso);
        await database.categories.put(archived);
        return archived;
      });
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      throw new NotaStorageError(
        'Gagal mengarsipkan kategori di penyimpanan lokal.',
        error,
      );
    }
  }

  async function getTransactions(): Promise<Transaction[]> {
    try {
      const records = await database.transactions.toArray();
      return sortTransactions(records, 'newest');
    } catch (error) {
      throw new NotaStorageError(
        'Gagal membaca daftar transaksi dari penyimpanan lokal.',
        error,
      );
    }
  }

  async function addTransaction(draft: TransactionDraft): Promise<Transaction> {
    try {
      return await database.transaction(
        'rw',
        database.settings,
        database.categories,
        database.transactions,
        async () => {
          const { categories } = await initialize();
          let transaction: Transaction;
          try {
            transaction = createTransaction(draft, categories);
          } catch (validationError) {
            throw new NotaStorageError(
              validationError instanceof Error
                ? validationError.message
                : 'Data transaksi tidak valid.',
              validationError,
            );
          }

          const duplicate = await database.transactions.get(transaction.id);
          if (duplicate) {
            throw new NotaStorageError(
              `Transaksi dengan ID "${transaction.id}" sudah ada.`,
            );
          }
          await database.transactions.add(transaction);
          return transaction;
        },
      );
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      throw new NotaStorageError(
        'Gagal menyimpan transaksi ke penyimpanan lokal.',
        error,
      );
    }
  }

  async function updateTransaction(
    transactionId: string,
    patch: TransactionPatch,
    updatedAtIso?: string,
  ): Promise<Transaction> {
    try {
      return await database.transaction(
        'rw',
        database.settings,
        database.categories,
        database.transactions,
        async () => {
          const { categories } = await initialize();
          const existing = await database.transactions.get(transactionId);
          if (!existing) {
            throw new NotaStorageError(
              `Transaksi dengan ID "${transactionId}" tidak ditemukan untuk diperbarui.`,
            );
          }

          let updated: Transaction;
          try {
            updated = applyTransactionEdit(
              existing,
              patch,
              updatedAtIso,
              categories,
            );
          } catch (validationError) {
            throw new NotaStorageError(
              validationError instanceof Error
                ? validationError.message
                : 'Perubahan transaksi tidak valid.',
              validationError,
            );
          }

          await database.transactions.put(updated);
          return updated;
        },
      );
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      throw new NotaStorageError(
        'Gagal memperbarui transaksi di penyimpanan lokal.',
        error,
      );
    }
  }

  async function deleteTransaction(transactionId: string): Promise<void> {
    try {
      await database.transaction('rw', database.transactions, async () => {
        const existing = await database.transactions.get(transactionId);
        if (!existing) {
          throw new NotaStorageError(
            `Transaksi dengan ID "${transactionId}" tidak ditemukan untuk dihapus.`,
          );
        }
        await database.transactions.delete(transactionId);
      });
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      throw new NotaStorageError(
        'Gagal menghapus transaksi dari penyimpanan lokal.',
        error,
      );
    }
  }

  async function getBudgets(): Promise<CategoryBudget[]> {
    try {
      const records = await database.budgets.toArray();
      return records.sort((a, b) =>
        a.categoryId.localeCompare(b.categoryId, 'id-ID'),
      );
    } catch (error) {
      throw new NotaStorageError(
        'Gagal membaca daftar anggaran kategori dari penyimpanan lokal.',
        error,
      );
    }
  }

  async function saveCategoryBudget(
    input: CategoryBudgetInput,
  ): Promise<CategoryBudget> {
    try {
      return await database.transaction(
        'rw',
        database.settings,
        database.categories,
        database.budgets,
        async () => {
          const { categories } = await initialize();
          const trimmedCategoryId =
            typeof input.categoryId === 'string'
              ? input.categoryId.trim()
              : '';
          const existingForCategory = await database.budgets
            .where('categoryId')
            .equals(trimmedCategoryId)
            .first();

          let budget: CategoryBudget;
          try {
            budget = createCategoryBudget(
              {
                ...input,
                id: existingForCategory?.id ?? input.id,
              },
              categories,
              existingForCategory
                ? { allowArchivedCategoryId: existingForCategory.categoryId }
                : undefined,
            );
          } catch (validationError) {
            throw new NotaStorageError(
              validationError instanceof Error
                ? validationError.message
                : 'Data anggaran kategori tidak valid.',
              validationError,
            );
          }

          await database.budgets.put(budget);
          return budget;
        },
      );
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      throw new NotaStorageError(
        'Gagal menyimpan anggaran kategori ke penyimpanan lokal.',
        error,
      );
    }
  }

  async function deleteCategoryBudget(categoryId: string): Promise<void> {
    const trimmedCategoryId =
      typeof categoryId === 'string' ? categoryId.trim() : '';
    try {
      await database.transaction('rw', database.budgets, async () => {
        const existing = await database.budgets
          .where('categoryId')
          .equals(trimmedCategoryId)
          .first();
        if (!existing) {
          throw new NotaStorageError(
            `Anggaran untuk kategori "${trimmedCategoryId}" tidak ditemukan untuk dihapus.`,
          );
        }
        await database.budgets.delete(existing.id);
      });
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      throw new NotaStorageError(
        'Gagal menghapus anggaran kategori dari penyimpanan lokal.',
        error,
      );
    }
  }

  async function getSavingsGoals(): Promise<SavingsGoal[]> {
    try {
      const records = await database.savingsGoals.toArray();
      return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      throw new NotaStorageError(
        'Gagal membaca daftar target tabungan dari penyimpanan lokal.',
        error,
      );
    }
  }

  async function addSavingsGoal(input: SavingsGoalInput): Promise<SavingsGoal> {
    let goal: SavingsGoal;
    try {
      goal = createSavingsGoal(input);
    } catch (validationError) {
      throw new NotaStorageError(
        validationError instanceof Error
          ? validationError.message
          : 'Data target tabungan tidak valid.',
        validationError,
      );
    }

    try {
      return await database.transaction(
        'rw',
        database.savingsGoals,
        async () => {
          const duplicate = await database.savingsGoals.get(goal.id);
          if (duplicate) {
            throw new NotaStorageError(
              `Target tabungan dengan ID "${goal.id}" sudah ada.`,
            );
          }
          await database.savingsGoals.add(goal);
          return goal;
        },
      );
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      throw new NotaStorageError(
        'Gagal menyimpan target tabungan ke penyimpanan lokal.',
        error,
      );
    }
  }

  async function updateSavingsGoal(
    goalId: string,
    patch: SavingsGoalPatch,
    updatedAtIso?: string,
  ): Promise<SavingsGoal> {
    const trimmedId = typeof goalId === 'string' ? goalId.trim() : '';
    try {
      return await database.transaction(
        'rw',
        database.savingsGoals,
        async () => {
          const existing = await database.savingsGoals.get(trimmedId);
          if (!existing) {
            throw new NotaStorageError(
              `Target tabungan dengan ID "${trimmedId}" tidak ditemukan untuk diperbarui.`,
            );
          }

          let updated: SavingsGoal;
          try {
            updated = applySavingsGoalEdit(existing, patch, updatedAtIso);
          } catch (validationError) {
            throw new NotaStorageError(
              validationError instanceof Error
                ? validationError.message
                : 'Perubahan target tabungan tidak valid.',
              validationError,
            );
          }

          await database.savingsGoals.put(updated);
          return updated;
        },
      );
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      throw new NotaStorageError(
        'Gagal memperbarui target tabungan di penyimpanan lokal.',
        error,
      );
    }
  }

  async function deleteSavingsGoal(goalId: string): Promise<void> {
    const trimmedId = typeof goalId === 'string' ? goalId.trim() : '';
    try {
      await database.transaction('rw', database.savingsGoals, async () => {
        const existing = await database.savingsGoals.get(trimmedId);
        if (!existing) {
          throw new NotaStorageError(
            `Target tabungan dengan ID "${trimmedId}" tidak ditemukan untuk dihapus.`,
          );
        }
        await database.savingsGoals.delete(trimmedId);
      });
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      throw new NotaStorageError(
        'Gagal menghapus target tabungan dari penyimpanan lokal.',
        error,
      );
    }
  }

  async function getDebtRecords(): Promise<DebtRecord[]> {
    try {
      const records = await database.debtRecords.toArray();
      return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      throw new NotaStorageError(
        'Gagal membaca daftar catatan utang/piutang dari penyimpanan lokal.',
        error,
      );
    }
  }

  async function addDebtRecord(input: DebtRecordInput): Promise<DebtRecord> {
    let record: DebtRecord;
    try {
      record = createDebtRecord(input);
    } catch (validationError) {
      throw new NotaStorageError(
        validationError instanceof Error
          ? validationError.message
          : 'Data catatan utang/piutang tidak valid.',
        validationError,
      );
    }

    try {
      return await database.transaction(
        'rw',
        database.debtRecords,
        async () => {
          const duplicate = await database.debtRecords.get(record.id);
          if (duplicate) {
            throw new NotaStorageError(
              `Catatan utang/piutang dengan ID "${record.id}" sudah ada.`,
            );
          }
          await database.debtRecords.add(record);
          return record;
        },
      );
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      throw new NotaStorageError(
        'Gagal menyimpan catatan utang/piutang ke penyimpanan lokal.',
        error,
      );
    }
  }

  async function updateDebtRecord(
    debtId: string,
    patch: DebtRecordPatch,
    updatedAtIso?: string,
  ): Promise<DebtRecord> {
    const trimmedId = typeof debtId === 'string' ? debtId.trim() : '';
    try {
      return await database.transaction(
        'rw',
        database.debtRecords,
        async () => {
          const existing = await database.debtRecords.get(trimmedId);
          if (!existing) {
            throw new NotaStorageError(
              `Catatan utang/piutang dengan ID "${trimmedId}" tidak ditemukan untuk diperbarui.`,
            );
          }

          let updated: DebtRecord;
          try {
            updated = applyDebtRecordEdit(existing, patch, updatedAtIso);
          } catch (validationError) {
            throw new NotaStorageError(
              validationError instanceof Error
                ? validationError.message
                : 'Perubahan catatan utang/piutang tidak valid.',
              validationError,
            );
          }

          await database.debtRecords.put(updated);
          return updated;
        },
      );
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      throw new NotaStorageError(
        'Gagal memperbarui catatan utang/piutang di penyimpanan lokal.',
        error,
      );
    }
  }

  async function settleDebtRecordById(
    debtId: string,
    updatedAtIso?: string,
  ): Promise<DebtRecord> {
    const trimmedId = typeof debtId === 'string' ? debtId.trim() : '';
    try {
      return await database.transaction(
        'rw',
        database.debtRecords,
        async () => {
          const existing = await database.debtRecords.get(trimmedId);
          if (!existing) {
            throw new NotaStorageError(
              `Catatan utang/piutang dengan ID "${trimmedId}" tidak ditemukan untuk dilunasi.`,
            );
          }

          const settled = settleDebtRecord(existing, updatedAtIso);
          await database.debtRecords.put(settled);
          return settled;
        },
      );
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      throw new NotaStorageError(
        'Gagal menandai lunas catatan utang/piutang di penyimpanan lokal.',
        error,
      );
    }
  }

  async function deleteDebtRecord(debtId: string): Promise<void> {
    const trimmedId = typeof debtId === 'string' ? debtId.trim() : '';
    try {
      await database.transaction('rw', database.debtRecords, async () => {
        const existing = await database.debtRecords.get(trimmedId);
        if (!existing) {
          throw new NotaStorageError(
            `Catatan utang/piutang dengan ID "${trimmedId}" tidak ditemukan untuk dihapus.`,
          );
        }
        await database.debtRecords.delete(trimmedId);
      });
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      throw new NotaStorageError(
        'Gagal menghapus catatan utang/piutang dari penyimpanan lokal.',
        error,
      );
    }
  }

  async function loadWorkspaceState(
    period: DateRangePeriod = getCurrentMonthPeriod(new Date()),
  ): Promise<LocalWorkspaceState> {
    try {
      const { settings, categories } = await initialize();
      const rawTransactions = await database.transactions.toArray();
      const rawBudgets = await database.budgets.toArray();
      const rawSavingsGoals = await database.savingsGoals.toArray();
      const rawDebtRecords = await database.debtRecords.toArray();
      const transactions = sortTransactions(rawTransactions, 'newest');
      const budgets = [...rawBudgets].sort((a, b) =>
        a.categoryId.localeCompare(b.categoryId, 'id-ID'),
      );
      const savingsGoals = [...rawSavingsGoals].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
      const debtRecords = [...rawDebtRecords].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
      const overview = calculateOverviewSnapshot(
        settings.openingBalance,
        transactions,
        period,
      );

      return {
        settings,
        categories,
        transactions,
        budgets,
        savingsGoals,
        debtRecords,
        overview,
      };
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      throw new NotaStorageError(
        'Gagal memuat data keuangan lokal dari browser.',
        error,
      );
    }
  }

  async function exportBackup(
    exportedAt?: string,
  ): Promise<NotaBackupPayload> {
    try {
      const { settings, categories } = await initialize();
      const rawTransactions = await database.transactions.toArray();
      const rawBudgets = await database.budgets.toArray();
      const rawSavingsGoals = await database.savingsGoals.toArray();
      const rawDebtRecords = await database.debtRecords.toArray();
      return createBackupPayload({
        settings,
        categories,
        transactions: rawTransactions,
        budgets: rawBudgets,
        savingsGoals: rawSavingsGoals,
        debtRecords: rawDebtRecords,
        exportedAt,
      });
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      throw new NotaStorageError(
        'Gagal mengekspor cadangan data dari penyimpanan lokal.',
        error,
      );
    }
  }

  async function restoreBackup(
    rawJsonOrPayload: string | unknown,
  ): Promise<NotaBackupPreview> {
    const validation =
      typeof rawJsonOrPayload === 'string'
        ? parseAndValidateBackupJson(rawJsonOrPayload)
        : validateBackupObject(rawJsonOrPayload);

    if (!validation.valid) {
      throw new NotaStorageError(validation.errors[0]);
    }

    const { payload } = validation.preview;

    try {
      await database.transaction(
        'rw',
        [
          database.settings,
          database.categories,
          database.transactions,
          database.budgets,
          database.savingsGoals,
          database.debtRecords,
        ],
        async () => {
          await database.debtRecords.clear();
          await database.savingsGoals.clear();
          await database.budgets.clear();
          await database.transactions.clear();
          await database.categories.clear();
          await database.settings.clear();

          const storedSettings: StoredAppSettings = {
            id: PRIMARY_SETTINGS_ID,
            openingBalance: payload.settings.openingBalance,
            currency: payload.settings.currency,
            onboardingCompleted: payload.settings.onboardingCompleted,
            updatedAt: payload.exportedAt,
          };

          await database.settings.put(storedSettings);
          await database.categories.bulkAdd(payload.categories);
          if (payload.transactions.length > 0) {
            await database.transactions.bulkAdd(payload.transactions);
          }
          if (payload.budgets && payload.budgets.length > 0) {
            await database.budgets.bulkAdd(payload.budgets);
          }
          if (payload.savingsGoals && payload.savingsGoals.length > 0) {
            await database.savingsGoals.bulkAdd(payload.savingsGoals);
          }
          if (payload.debtRecords && payload.debtRecords.length > 0) {
            await database.debtRecords.bulkAdd(payload.debtRecords);
          }
        },
      );

      return validation.preview;
    } catch (error) {
      if (error instanceof NotaStorageError) {
        throw error;
      }
      throw new NotaStorageError(
        'Gagal memulihkan cadangan ke penyimpanan lokal perangkat. Data sebelumnya tetap dipertahankan.',
        error,
      );
    }
  }

  return {
    initialize,
    getSettings,
    saveOpeningBalance,
    getCategories,
    addCategory,
    updateCategoryName,
    archiveCategoryById,
    getTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getBudgets,
    saveCategoryBudget,
    deleteCategoryBudget,
    getSavingsGoals,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    getDebtRecords,
    addDebtRecord,
    updateDebtRecord,
    settleDebtRecordById,
    deleteDebtRecord,
    loadWorkspaceState,
    exportBackup,
    restoreBackup,
  };
}

export const notaRepository = createNotaRepository();

