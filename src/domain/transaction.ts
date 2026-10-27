/**
 * Core Domain Types & Default Category Definitions for Nota.
 *
 * Source of truth: PRD.md §5.1, §6, §7 & ARCHITECTURE.md §3, §4.
 * Pure TypeScript module with zero React or browser-storage dependencies.
 */

import { toLocalDateString } from '../lib/date';
import {
  validateCategoryInput,
  validateTransactionDraft,
  validateTransactionPatch,
} from './validation';

export type TransactionType = 'income' | 'expense';

export const MAX_TRANSACTION_NOTE_LENGTH = 280;
export const MAX_CATEGORY_NAME_LENGTH = 48;

export interface Transaction {
  /** Unique local identifier */
  id: string;
  /** Whether the transaction adds to (`income`) or subtracts from (`expense`) virtual balance */
  type: TransactionType;
  /** Positive integer amount in Indonesian Rupiah (IDR) */
  amount: number;
  /** Reference to a `Category.id` */
  categoryId: string;
  /** Local occurrence date in `YYYY-MM-DD` format */
  occurredAt: string;
  /** Optional trimmed note (max 280 characters) */
  note?: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last-update timestamp */
  updatedAt: string;
}

export interface TransactionDraft {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  occurredAt?: string;
  note?: string;
  nowIso?: string;
}

export interface TransactionPatch {
  type?: TransactionType;
  amount?: number;
  categoryId?: string;
  occurredAt?: string;
  note?: string;
}

export interface Category {
  /** Unique local identifier */
  id: string;
  /** Display name in Bahasa Indonesia */
  name: string;
  /** Category direction (`income` or `expense`) */
  type: TransactionType;
  /** Semantic color token key aligned with Nota design tokens */
  color: string;
  /** Optional Lucide icon key */
  iconKey?: string;
  /** True if seeded by default */
  isDefault: boolean;
  /** Optional ISO 8601 timestamp when archived; archived categories remain readable on historical transactions */
  archivedAt?: string;
}

export interface CategoryInput {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  iconKey?: string;
  isDefault?: boolean;
  archivedAt?: string;
}

export interface AppSettings {
  /** Baseline integer IDR balance before all recorded transactions (may be 0; not counted as period income) */
  openingBalance: number;
  /** Fixed to `'IDR'` for MVP */
  currency: 'IDR';
  /** Whether the user has completed first-run setup */
  onboardingCompleted: boolean;
}

export const DEFAULT_APP_SETTINGS: Readonly<AppSettings> = Object.freeze({
  openingBalance: 0,
  currency: 'IDR',
  onboardingCompleted: false,
});

/**
 * Sensible default Indonesian categories separated by `income` and `expense` (PRD.md §5.1 Kategori).
 * Seeded as definitions only — never fake transactions.
 */
export const DEFAULT_CATEGORIES: readonly Readonly<Category>[] = Object.freeze([
  // Income (Pemasukan)
  Object.freeze({
    id: 'cat-inc-gaji',
    name: 'Gaji & Upah',
    type: 'income',
    color: 'emerald',
    iconKey: 'briefcase',
    isDefault: true,
  }),
  Object.freeze({
    id: 'cat-inc-usaha',
    name: 'Hasil Usaha & Freelance',
    type: 'income',
    color: 'emerald',
    iconKey: 'laptop',
    isDefault: true,
  }),
  Object.freeze({
    id: 'cat-inc-bonus',
    name: 'Bonus & Tunjangan',
    type: 'income',
    color: 'lime',
    iconKey: 'sparkles',
    isDefault: true,
  }),
  Object.freeze({
    id: 'cat-inc-lainnya',
    name: 'Pemasukan Lainnya',
    type: 'income',
    color: 'soft-green',
    iconKey: 'plus-circle',
    isDefault: true,
  }),

  // Expense (Pengeluaran)
  Object.freeze({
    id: 'cat-exp-makanan',
    name: 'Makanan & Minuman',
    type: 'expense',
    color: 'expense',
    iconKey: 'utensils',
    isDefault: true,
  }),
  Object.freeze({
    id: 'cat-exp-transportasi',
    name: 'Transportasi',
    type: 'expense',
    color: 'expense',
    iconKey: 'car',
    isDefault: true,
  }),
  Object.freeze({
    id: 'cat-exp-tempat-tinggal',
    name: 'Tempat Tinggal & Tagihan',
    type: 'expense',
    color: 'expense',
    iconKey: 'home',
    isDefault: true,
  }),
  Object.freeze({
    id: 'cat-exp-belanja',
    name: 'Belanja Kebutuhan',
    type: 'expense',
    color: 'expense',
    iconKey: 'shopping-bag',
    isDefault: true,
  }),
  Object.freeze({
    id: 'cat-exp-kesehatan',
    name: 'Kesehatan',
    type: 'expense',
    color: 'expense',
    iconKey: 'heart-pulse',
    isDefault: true,
  }),
  Object.freeze({
    id: 'cat-exp-hiburan',
    name: 'Hiburan & Langganan',
    type: 'expense',
    color: 'expense',
    iconKey: 'film',
    isDefault: true,
  }),
  Object.freeze({
    id: 'cat-exp-lainnya',
    name: 'Pengeluaran Lainnya',
    type: 'expense',
    color: 'muted',
    iconKey: 'more-horizontal',
    isDefault: true,
  }),
]);

/**
 * Pure factory that creates a validated `Transaction` record.
 * Defaults `occurredAt` to today's local date (`YYYY-MM-DD`) per PRD.md §5.1.
 */
export function createTransaction(
  draft: TransactionDraft,
  categories?: readonly Category[],
): Transaction {
  const occurredAt = draft.occurredAt ?? toLocalDateString(new Date());
  const timestamp = draft.nowIso ?? new Date().toISOString();

  const validation = validateTransactionDraft(
    {
      ...draft,
      occurredAt,
    },
    categories,
  );

  if (!validation.valid) {
    throw new Error(validation.errors[0]);
  }

  const trimmedNote = draft.note?.trim();

  return {
    id: draft.id.trim(),
    type: draft.type,
    amount: draft.amount,
    categoryId: draft.categoryId.trim(),
    occurredAt,
    ...(trimmedNote ? { note: trimmedNote } : {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Pure function that applies an edit patch to an existing `Transaction` without mutating it.
 * Per PRD.md §7.4: Editing a transaction replaces the old values on the same ID (`createdAt` preserved, `updatedAt` refreshed).
 */
export function applyTransactionEdit(
  existing: Transaction,
  patch: TransactionPatch,
  updatedAtIso: string = new Date().toISOString(),
  categories?: readonly Category[],
): Transaction {
  const patchValidation = validateTransactionPatch(patch);
  if (!patchValidation.valid) {
    throw new Error(patchValidation.errors[0]);
  }

  const nextNote =
    patch.note !== undefined ? patch.note.trim() : existing.note;

  const updatedCandidate: TransactionDraft = {
    id: existing.id,
    type: patch.type ?? existing.type,
    amount: patch.amount ?? existing.amount,
    categoryId:
      patch.categoryId !== undefined
        ? patch.categoryId.trim()
        : existing.categoryId,
    occurredAt: patch.occurredAt ?? existing.occurredAt,
    note: nextNote,
  };

  const fullValidation = validateTransactionDraft(
    updatedCandidate,
    categories,
    { allowArchivedCategoryId: existing.categoryId },
  );

  if (!fullValidation.valid) {
    throw new Error(fullValidation.errors[0]);
  }

  return {
    id: existing.id,
    type: updatedCandidate.type,
    amount: updatedCandidate.amount,
    categoryId: updatedCandidate.categoryId,
    occurredAt: updatedCandidate.occurredAt!,
    ...(nextNote ? { note: nextNote } : {}),
    createdAt: existing.createdAt,
    updatedAt: updatedAtIso,
  };
}

/**
 * Pure helper that replaces an edited transaction in a collection by ID (PRD.md §7.4).
 * Ensures editing never duplicates a record and rejects lists with duplicate matching IDs.
 * Throws if the transaction ID is not found.
 */
export function replaceTransactionInList(
  transactions: readonly Transaction[],
  updatedTransaction: Transaction,
): Transaction[] {
  let matchCount = 0;
  const nextList = transactions.map((tx) => {
    if (tx.id === updatedTransaction.id) {
      matchCount += 1;
      return updatedTransaction;
    }
    return tx;
  });

  if (matchCount === 0) {
    throw new Error(
      `Transaksi dengan ID "${updatedTransaction.id}" tidak ditemukan untuk diperbarui.`,
    );
  }
  if (matchCount > 1) {
    throw new Error(
      `Ditemukan duplikasi transaksi dengan ID "${updatedTransaction.id}".`,
    );
  }

  return nextList;
}

/**
 * Pure helper that removes a transaction by ID (PRD.md §7.5).
 * Once removed, the transaction has zero effect on balance or period summaries.
 */
export function removeTransactionFromList(
  transactions: readonly Transaction[],
  transactionId: string,
): Transaction[] {
  return transactions.filter((tx) => tx.id !== transactionId);
}

/**
 * Pure factory for creating a validated custom `Category`.
 */
export function createCategory(input: CategoryInput): Category {
  const validation = validateCategoryInput(input);
  if (!validation.valid) {
    throw new Error(validation.errors[0]);
  }

  return {
    id: input.id.trim(),
    name: input.name.trim(),
    type: input.type,
    color: input.color.trim(),
    ...(input.iconKey?.trim() ? { iconKey: input.iconKey.trim() } : {}),
    isDefault: Boolean(input.isDefault),
    ...(input.archivedAt ? { archivedAt: input.archivedAt } : {}),
  };
}

/**
 * Pure helper to archive a category without deleting it so existing transactions keep their category meaning (PRD.md §5.1).
 */
export function archiveCategory(
  category: Category,
  archivedAtIso: string = new Date().toISOString(),
): Category {
  return {
    ...category,
    archivedAt: archivedAtIso,
  };
}

/**
 * Pure helper to rename a category while preserving its ID and historical references.
 */
export function renameCategory(category: Category, newName: string): Category {
  const candidate: CategoryInput = {
    ...category,
    name: newName,
  };
  const validation = validateCategoryInput(candidate);
  if (!validation.valid) {
    throw new Error(validation.errors[0]);
  }
  return {
    ...category,
    name: newName.trim(),
  };
}

/**
 * Returns categories selectable for new transactions of a given `type`.
 * Includes active (non-archived) categories, plus an optional currently-selected `preserveCategoryId`
 * when editing a historical transaction whose category was later archived (PRD.md §5.1).
 */
export function getSelectableCategories(
  categories: readonly Category[],
  type: TransactionType,
  preserveCategoryId?: string,
): Category[] {
  return categories.filter(
    (cat) =>
      cat.type === type &&
      (!cat.archivedAt || cat.id === preserveCategoryId),
  );
}

