/**
 * Pure Validation Rules for Transactions, Categories, and Application Settings.
 *
 * Source of truth: PRD.md §5.1, §6, §7 & ARCHITECTURE.md §4.
 */

import { isValidLocalDateString } from '../lib/date';
import { isValidOpeningBalance, isValidTransactionAmount } from './money';
import {
  MAX_CATEGORY_NAME_LENGTH,
  MAX_TRANSACTION_NOTE_LENGTH,
  type AppSettings,
  type Category,
  type CategoryInput,
  type TransactionDraft,
  type TransactionPatch,
  type TransactionType,
} from './transaction';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface TransactionValidationOptions {
  /**
   * When editing an existing transaction whose category was previously archived,
   * allow keeping that same archived `categoryId` so historical meaning is preserved (PRD.md §5.1).
   */
  allowArchivedCategoryId?: string;
}

/**
 * Checks whether a value is a valid `TransactionType` (`'income' | 'expense'`).
 * Transfers or unknown types are strictly rejected per PRD.md §7.9.
 */
export function isValidTransactionType(value: unknown): value is TransactionType {
  return value === 'income' || value === 'expense';
}

/**
 * Validates a `TransactionDraft` before creation or full update.
 * Optionally checks that `categoryId` exists in `categories` and matches the transaction's `type`.
 */
export function validateTransactionDraft(
  draft: Partial<TransactionDraft> | null | undefined,
  categories?: readonly Category[],
  options?: TransactionValidationOptions,
): ValidationResult {
  const errors: string[] = [];

  if (!draft || typeof draft !== 'object') {
    return {
      valid: false,
      errors: ['Data transaksi tidak boleh kosong.'],
    };
  }

  if (typeof draft.id !== 'string' || draft.id.trim().length === 0) {
    errors.push('ID transaksi wajib diisi.');
  }

  if (!isValidTransactionType(draft.type)) {
    errors.push('Jenis transaksi harus berupa pemasukan (income) atau pengeluaran (expense).');
  }

  if (!isValidTransactionAmount(draft.amount)) {
    errors.push('Nominal transaksi harus berupa bilangan bulat Rupiah lebih besar dari 0.');
  }

  if (typeof draft.categoryId !== 'string' || draft.categoryId.trim().length === 0) {
    errors.push('Kategori transaksi wajib dipilih.');
  } else if (categories !== undefined && isValidTransactionType(draft.type)) {
    const trimmedCategoryId = draft.categoryId.trim();
    const matchedCategory = categories.find((cat) => cat.id === trimmedCategoryId);

    if (!matchedCategory) {
      errors.push('Kategori yang dipilih tidak ditemukan.');
    } else {
      if (matchedCategory.type !== draft.type) {
        errors.push(
          `Kategori "${matchedCategory.name}" tidak sesuai dengan jenis transaksi ${
            draft.type === 'income' ? 'pemasukan' : 'pengeluaran'
          }.`,
        );
      }
      if (
        matchedCategory.archivedAt &&
        matchedCategory.id !== options?.allowArchivedCategoryId
      ) {
        errors.push(
          `Kategori "${matchedCategory.name}" sudah diarsipkan dan tidak dapat dipilih untuk transaksi baru.`,
        );
      }
    }
  }

  if (!isValidLocalDateString(draft.occurredAt)) {
    errors.push('Tanggal transaksi harus berformat tanggal lokal YYYY-MM-DD yang valid.');
  }

  if (draft.note !== undefined) {
    if (typeof draft.note !== 'string') {
      errors.push('Catatan transaksi harus berupa teks.');
    } else if (draft.note.trim().length > MAX_TRANSACTION_NOTE_LENGTH) {
      errors.push(
        `Catatan transaksi maksimal ${MAX_TRANSACTION_NOTE_LENGTH} karakter.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a partial `TransactionPatch` before applying it to an existing transaction.
 */
export function validateTransactionPatch(
  patch: TransactionPatch | null | undefined,
): ValidationResult {
  const errors: string[] = [];

  if (!patch || typeof patch !== 'object') {
    return {
      valid: false,
      errors: ['Perubahan transaksi tidak boleh kosong.'],
    };
  }

  if (patch.type !== undefined && !isValidTransactionType(patch.type)) {
    errors.push('Jenis transaksi harus berupa pemasukan (income) atau pengeluaran (expense).');
  }

  if (patch.amount !== undefined && !isValidTransactionAmount(patch.amount)) {
    errors.push('Nominal transaksi harus berupa bilangan bulat Rupiah lebih besar dari 0.');
  }

  if (
    patch.categoryId !== undefined &&
    (typeof patch.categoryId !== 'string' || patch.categoryId.trim().length === 0)
  ) {
    errors.push('Kategori transaksi wajib dipilih.');
  }

  if (patch.occurredAt !== undefined && !isValidLocalDateString(patch.occurredAt)) {
    errors.push('Tanggal transaksi harus berformat tanggal lokal YYYY-MM-DD yang valid.');
  }

  if (patch.note !== undefined) {
    if (typeof patch.note !== 'string') {
      errors.push('Catatan transaksi harus berupa teks.');
    } else if (patch.note.trim().length > MAX_TRANSACTION_NOTE_LENGTH) {
      errors.push(
        `Catatan transaksi maksimal ${MAX_TRANSACTION_NOTE_LENGTH} karakter.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a `CategoryInput` object.
 */
export function validateCategoryInput(
  input: Partial<CategoryInput> | null | undefined,
): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return {
      valid: false,
      errors: ['Data kategori tidak boleh kosong.'],
    };
  }

  if (typeof input.id !== 'string' || input.id.trim().length === 0) {
    errors.push('ID kategori wajib diisi.');
  }

  if (typeof input.name !== 'string' || input.name.trim().length === 0) {
    errors.push('Nama kategori wajib diisi.');
  } else if (input.name.trim().length > MAX_CATEGORY_NAME_LENGTH) {
    errors.push(`Nama kategori maksimal ${MAX_CATEGORY_NAME_LENGTH} karakter.`);
  }

  if (!isValidTransactionType(input.type)) {
    errors.push('Jenis kategori harus berupa pemasukan (income) atau pengeluaran (expense).');
  }

  if (typeof input.color !== 'string' || input.color.trim().length === 0) {
    errors.push('Token warna kategori wajib diisi.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates `AppSettings` (openingBalance integer IDR >= 0, currency === 'IDR').
 */
export function validateAppSettings(
  settings: Partial<AppSettings> | null | undefined,
): ValidationResult {
  const errors: string[] = [];

  if (!settings || typeof settings !== 'object') {
    return {
      valid: false,
      errors: ['Pengaturan aplikasi tidak boleh kosong.'],
    };
  }

  if (!isValidOpeningBalance(settings.openingBalance)) {
    errors.push('Saldo awal harus berupa bilangan bulat Rupiah (0 atau lebih besar).');
  }

  if (settings.currency !== 'IDR') {
    errors.push('Mata uang MVP harus berupa IDR.');
  }

  if (typeof settings.onboardingCompleted !== 'boolean') {
    errors.push('Status onboarding harus berupa boolean.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

