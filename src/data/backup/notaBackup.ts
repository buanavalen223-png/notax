/**
 * Versioned Backup & Restore Domain Module for Nota.
 *
 * Source of truth: PRD.md §5.1, §11 & ARCHITECTURE.md §5, §6.
 *
 * Responsibilities:
 * - Construct versioned JSON backup payloads (`appName`, `schemaVersion`, `exportedAt`, `settings`, `categories`, `transactions`).
 * - Validate imported JSON strings or objects exhaustively BEFORE any database mutation occurs.
 * - Compute a human-readable `NotaBackupPreview` so the user can review record counts and balances before confirming a replace.
 * - Export transactions to CSV safely without formula injection.
 */

import { NOTA_SCHEMA_VERSION } from '../db';
import { isValidLocalDateString } from '../../lib/date';
import {
  type CategoryBudget,
  createCategoryBudget,
} from '../../domain/budget';
import {
  type DebtRecord,
  createDebtRecord,
} from '../../domain/debtRecord';
import {
  type SavingsGoal,
  createSavingsGoal,
} from '../../domain/savingsGoal';
import { addIdr, isValidOpeningBalance, isValidTransactionAmount } from '../../domain/money';
import {
  calculateCurrentBalance,
  calculateIncomeAndExpenseTotals,
  sortTransactions,
} from '../../domain/summaries';
import {
  DEFAULT_CATEGORIES,
  type AppSettings,
  type Category,
  type Transaction,
} from '../../domain/transaction';
import {
  validateAppSettings,
  validateCategoryInput,
  validateTransactionDraft,
} from '../../domain/validation';

export const NOTA_BACKUP_APP_NAME = 'Nota' as const;
export const SUPPORTED_BACKUP_SCHEMA_VERSION = NOTA_SCHEMA_VERSION;

export interface NotaBackupPayload {
  appName: typeof NOTA_BACKUP_APP_NAME;
  schemaVersion: number;
  exportedAt: string;
  settings: AppSettings;
  categories: Category[];
  transactions: Transaction[];
  budgets?: CategoryBudget[];
  savingsGoals?: SavingsGoal[];
  debtRecords?: DebtRecord[];
}

export interface NotaBackupPreview {
  payload: NotaBackupPayload;
  rawJson: string;
  summary: {
    schemaVersion: number;
    exportedAt: string;
    openingBalance: number;
    currentBalance: number;
    totalIncome: number;
    totalExpense: number;
    transactionCount: number;
    categoryCount: number;
    archivedCategoryCount: number;
    budgetCount: number;
    savingsGoalCount: number;
    debtRecordCount: number;
  };
}

export type BackupValidationResult =
  | { valid: true; preview: NotaBackupPreview }
  | { valid: false; errors: string[] };

function isValidIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }
  const time = Date.parse(value);
  return !Number.isNaN(time);
}

/**
 * Ensures all default Indonesian categories exist in a category collection
 * without overwriting user-renamed or archived default categories.
 */
export function mergeWithDefaultCategories(
  categories: readonly Category[],
): Category[] {
  const existingIds = new Set(categories.map((c) => c.id));
  const missingDefaults = DEFAULT_CATEGORIES.filter(
    (c) => !existingIds.has(c.id),
  ).map((c) => ({ ...c }));

  return [...categories.map((c) => ({ ...c })), ...missingDefaults];
}

/**
 * Creates a validated `NotaBackupPayload` from current workspace records.
 */
export function createBackupPayload(params: {
  settings: AppSettings;
  categories: readonly Category[];
  transactions: readonly Transaction[];
  budgets?: readonly CategoryBudget[];
  savingsGoals?: readonly SavingsGoal[];
  debtRecords?: readonly DebtRecord[];
  exportedAt?: string;
}): NotaBackupPayload {
  const exportedAt = params.exportedAt ?? new Date().toISOString();
  const budgets = (params.budgets ?? [])
    .map((b) => ({ ...b }))
    .sort((a, b) => a.categoryId.localeCompare(b.categoryId, 'id-ID'));
  const savingsGoals = (params.savingsGoals ?? [])
    .map((g) => ({ ...g }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const debtRecords = (params.debtRecords ?? [])
    .map((d) => ({ ...d }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    appName: NOTA_BACKUP_APP_NAME,
    schemaVersion: SUPPORTED_BACKUP_SCHEMA_VERSION,
    exportedAt,
    settings: {
      openingBalance: params.settings.openingBalance,
      currency: params.settings.currency,
      onboardingCompleted: params.settings.onboardingCompleted,
    },
    categories: mergeWithDefaultCategories(params.categories),
    transactions: sortTransactions(params.transactions, 'newest').map((tx) => ({
      ...tx,
    })),
    budgets,
    savingsGoals,
    debtRecords,
  };
}

/**
 * Serializes a `NotaBackupPayload` into formatted JSON for download.
 */
export function serializeBackupPayload(payload: NotaBackupPayload): string {
  return JSON.stringify(payload, null, 2);
}

/**
 * Parses and exhaustively validates a raw JSON string as a `NotaBackupPayload`.
 * Never mutates external state. Returns clear Indonesian error messages on failure.
 */
export function parseAndValidateBackupJson(
  rawJson: string,
): BackupValidationResult {
  if (typeof rawJson !== 'string' || rawJson.trim().length === 0) {
    return {
      valid: false,
      errors: ['File cadangan kosong atau tidak dapat dibaca.'],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      valid: false,
      errors: [
        'File cadangan bukan berformat JSON yang valid. Pastikan Anda memilih file .json dari Nota.',
      ],
    };
  }

  return validateBackupObject(parsed, rawJson);
}

/**
 * Validates an unknown parsed object as a `NotaBackupPayload` and builds a `NotaBackupPreview`.
 */
export function validateBackupObject(
  candidate: unknown,
  rawJsonSource?: string,
): BackupValidationResult {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return {
      valid: false,
      errors: ['Struktur file cadangan tidak valid (harus berupa objek JSON).'],
    };
  }

  const record = candidate as Record<string, unknown>;

  if (record.appName !== NOTA_BACKUP_APP_NAME) {
    return {
      valid: false,
      errors: [
        'File cadangan bukan berasal dari aplikasi Nota (properti appName tidak sesuai).',
      ],
    };
  }

  if (typeof record.schemaVersion !== 'number' || !Number.isInteger(record.schemaVersion)) {
    return {
      valid: false,
      errors: ['Versi skema cadangan (schemaVersion) tidak ditemukan atau tidak valid.'],
    };
  }

  if (
    record.schemaVersion < 1 ||
    record.schemaVersion > SUPPORTED_BACKUP_SCHEMA_VERSION
  ) {
    return {
      valid: false,
      errors: [
        `Versi skema cadangan (${record.schemaVersion}) tidak didukung oleh versi Nota ini (mendukung versi 1–${SUPPORTED_BACKUP_SCHEMA_VERSION}).`,
      ],
    };
  }

  if (!isValidIsoTimestamp(record.exportedAt)) {
    return {
      valid: false,
      errors: ['Waktu ekspor cadangan (exportedAt) tidak valid.'],
    };
  }

  // Validate settings
  const rawSettings = record.settings as Partial<AppSettings> | undefined;
  const settingsValidation = validateAppSettings(rawSettings);
  if (!settingsValidation.valid || !rawSettings) {
    return {
      valid: false,
      errors: [
        `Data pengaturan dalam cadangan tidak valid: ${
          settingsValidation.errors[0] ?? 'Pengaturan rusak.'
        }`,
      ],
    };
  }

  if (!isValidOpeningBalance(rawSettings.openingBalance)) {
    return {
      valid: false,
      errors: ['Nominal saldo awal dalam cadangan tidak valid.'],
    };
  }

  const validatedSettings: AppSettings = {
    openingBalance: rawSettings.openingBalance,
    currency: 'IDR',
    onboardingCompleted: Boolean(rawSettings.onboardingCompleted),
  };

  // Validate categories
  if (!Array.isArray(record.categories) || record.categories.length === 0) {
    return {
      valid: false,
      errors: ['Daftar kategori dalam cadangan tidak ditemukan atau kosong.'],
    };
  }

  const validatedCategories: Category[] = [];
  const seenCategoryIds = new Set<string>();

  for (let i = 0; i < record.categories.length; i += 1) {
    const rawCat = record.categories[i] as Record<string, unknown> | null | undefined;
    if (!rawCat || typeof rawCat !== 'object') {
      return {
        valid: false,
        errors: [`Kategori pada indeks #${i + 1} rusak atau bukan objek.`],
      };
    }

    const catValidation = validateCategoryInput({
      id: typeof rawCat.id === 'string' ? rawCat.id : '',
      name: typeof rawCat.name === 'string' ? rawCat.name : '',
      type: rawCat.type as Category['type'],
      color: typeof rawCat.color === 'string' ? rawCat.color : '',
    });

    if (!catValidation.valid) {
      return {
        valid: false,
        errors: [
          `Kategori pada indeks #${i + 1} tidak valid: ${catValidation.errors[0]}`,
        ],
      };
    }

    const trimmedId = (rawCat.id as string).trim();
    if (seenCategoryIds.has(trimmedId)) {
      return {
        valid: false,
        errors: [`Ditemukan duplikasi ID kategori "${trimmedId}" dalam file cadangan.`],
      };
    }
    seenCategoryIds.add(trimmedId);

    if (
      rawCat.archivedAt !== undefined &&
      rawCat.archivedAt !== null &&
      !isValidIsoTimestamp(rawCat.archivedAt)
    ) {
      return {
        valid: false,
        errors: [
          `Waktu arsip kategori "${trimmedId}" tidak valid.`,
        ],
      };
    }

    validatedCategories.push({
      id: trimmedId,
      name: (rawCat.name as string).trim(),
      type: rawCat.type as Category['type'],
      color: (rawCat.color as string).trim(),
      ...(typeof rawCat.iconKey === 'string' && rawCat.iconKey.trim()
        ? { iconKey: rawCat.iconKey.trim() }
        : {}),
      isDefault: Boolean(rawCat.isDefault),
      ...(typeof rawCat.archivedAt === 'string' && rawCat.archivedAt.trim()
        ? { archivedAt: rawCat.archivedAt.trim() }
        : {}),
    });
  }

  const completeCategories = mergeWithDefaultCategories(validatedCategories);

  // Validate transactions
  if (!Array.isArray(record.transactions)) {
    return {
      valid: false,
      errors: ['Daftar transaksi dalam cadangan tidak valid (harus berupa array).'],
    };
  }

  const validatedTransactions: Transaction[] = [];
  const seenTransactionIds = new Set<string>();

  for (let i = 0; i < record.transactions.length; i += 1) {
    const rawTx = record.transactions[i] as Record<string, unknown> | null | undefined;
    if (!rawTx || typeof rawTx !== 'object') {
      return {
        valid: false,
        errors: [`Transaksi pada indeks #${i + 1} rusak atau bukan objek.`],
      };
    }

    const txId = typeof rawTx.id === 'string' ? rawTx.id.trim() : '';
    const txCategoryId =
      typeof rawTx.categoryId === 'string' ? rawTx.categoryId.trim() : '';
    const txAmount = typeof rawTx.amount === 'number' ? rawTx.amount : NaN;
    const txOccurredAt =
      typeof rawTx.occurredAt === 'string' ? rawTx.occurredAt : '';
    const txNote =
      rawTx.note !== undefined && rawTx.note !== null
        ? String(rawTx.note)
        : undefined;

    if (!isValidTransactionAmount(txAmount)) {
      return {
        valid: false,
        errors: [
          `Transaksi pada indeks #${i + 1} memiliki nominal IDR yang tidak valid.`,
        ],
      };
    }

    if (!isValidLocalDateString(txOccurredAt)) {
      return {
        valid: false,
        errors: [
          `Transaksi pada indeks #${i + 1} memiliki tanggal kejadian (${txOccurredAt}) yang tidak valid.`,
        ],
      };
    }

    const draftValidation = validateTransactionDraft(
      {
        id: txId,
        type: rawTx.type as Transaction['type'],
        amount: txAmount,
        categoryId: txCategoryId,
        occurredAt: txOccurredAt,
        note: txNote,
      },
      completeCategories,
      { allowArchivedCategoryId: txCategoryId },
    );

    if (!draftValidation.valid) {
      return {
        valid: false,
        errors: [
          `Transaksi pada indeks #${i + 1} tidak valid: ${draftValidation.errors[0]}`,
        ],
      };
    }

    if (seenTransactionIds.has(txId)) {
      return {
        valid: false,
        errors: [
          `Ditemukan duplikasi ID transaksi "${txId}" dalam file cadangan.`,
        ],
      };
    }
    seenTransactionIds.add(txId);

    const createdAt = isValidIsoTimestamp(rawTx.createdAt)
      ? rawTx.createdAt
      : record.exportedAt;
    const updatedAt = isValidIsoTimestamp(rawTx.updatedAt)
      ? rawTx.updatedAt
      : createdAt;

    const trimmedNote = txNote?.trim();

    validatedTransactions.push({
      id: txId,
      type: rawTx.type as Transaction['type'],
      amount: txAmount,
      categoryId: txCategoryId,
      occurredAt: txOccurredAt,
      ...(trimmedNote ? { note: trimmedNote } : {}),
      createdAt,
      updatedAt,
    });
  }

  // Verify aggregate arithmetic safety (no overflow when computing totals and balance)
  let totalIncome = 0;
  let totalExpense = 0;
  let currentBalance = 0;
  try {
    const totals = calculateIncomeAndExpenseTotals(validatedTransactions);
    totalIncome = totals.totalIncome;
    totalExpense = totals.totalExpense;
    currentBalance = calculateCurrentBalance(
      validatedSettings.openingBalance,
      validatedTransactions,
    );
    // Also verify total flow does not exceed safe integer bounds
    addIdr(totalIncome, totalExpense);
  } catch (arithError) {
    return {
      valid: false,
      errors: [
        arithError instanceof Error
          ? arithError.message
          : 'Total nilai transaksi dalam cadangan melebihi batas aman perhitungan Rupiah.',
      ],
    };
  }

  // Validate optional category budgets (schemaVersion 1 may omit budgets; schemaVersion 2 includes budgets)
  const validatedBudgets: CategoryBudget[] = [];
  const seenBudgetIds = new Set<string>();
  const seenBudgetCategoryIds = new Set<string>();

  if (record.budgets !== undefined) {
    if (!Array.isArray(record.budgets)) {
      return {
        valid: false,
        errors: [
          'Daftar anggaran kategori dalam cadangan tidak valid (harus berupa array).',
        ],
      };
    }

    for (let i = 0; i < record.budgets.length; i += 1) {
      const rawBudget = record.budgets[i] as
        | Record<string, unknown>
        | null
        | undefined;
      if (!rawBudget || typeof rawBudget !== 'object') {
        return {
          valid: false,
          errors: [
            `Anggaran kategori pada indeks #${i + 1} rusak atau bukan objek.`,
          ],
        };
      }

      const budgetId =
        typeof rawBudget.id === 'string' ? rawBudget.id.trim() : '';
      const budgetCategoryId =
        typeof rawBudget.categoryId === 'string'
          ? rawBudget.categoryId.trim()
          : '';
      const monthlyLimit =
        typeof rawBudget.monthlyLimit === 'number'
          ? rawBudget.monthlyLimit
          : NaN;
      const updatedAt = isValidIsoTimestamp(rawBudget.updatedAt)
        ? rawBudget.updatedAt
        : record.exportedAt;

      let validatedBudget: CategoryBudget;
      try {
        validatedBudget = createCategoryBudget(
          {
            id: budgetId || undefined,
            categoryId: budgetCategoryId,
            monthlyLimit,
            updatedAt,
          },
          completeCategories,
          { allowArchivedCategoryId: budgetCategoryId },
        );
      } catch (budgetErr) {
        return {
          valid: false,
          errors: [
            `Anggaran kategori pada indeks #${i + 1} tidak valid: ${
              budgetErr instanceof Error
                ? budgetErr.message
                : 'Data anggaran rusak.'
            }`,
          ],
        };
      }

      if (seenBudgetIds.has(validatedBudget.id)) {
        return {
          valid: false,
          errors: [
            `Ditemukan duplikasi ID anggaran "${validatedBudget.id}" dalam file cadangan.`,
          ],
        };
      }
      if (seenBudgetCategoryIds.has(validatedBudget.categoryId)) {
        return {
          valid: false,
          errors: [
            `Ditemukan duplikasi anggaran untuk kategori "${validatedBudget.categoryId}" dalam file cadangan.`,
          ],
        };
      }
      seenBudgetIds.add(validatedBudget.id);
      seenBudgetCategoryIds.add(validatedBudget.categoryId);
      validatedBudgets.push(validatedBudget);
    }
  }

  // Validate optional savings goals (schemaVersion 1–2 may omit savingsGoals; schemaVersion 3 includes savingsGoals)
  const validatedSavingsGoals: SavingsGoal[] = [];
  const seenGoalIds = new Set<string>();

  if (record.savingsGoals !== undefined) {
    if (!Array.isArray(record.savingsGoals)) {
      return {
        valid: false,
        errors: [
          'Daftar target tabungan dalam cadangan tidak valid (harus berupa array).',
        ],
      };
    }

    for (let i = 0; i < record.savingsGoals.length; i += 1) {
      const rawGoal = record.savingsGoals[i] as
        | Record<string, unknown>
        | null
        | undefined;
      if (!rawGoal || typeof rawGoal !== 'object') {
        return {
          valid: false,
          errors: [
            `Target tabungan pada indeks #${i + 1} rusak atau bukan objek.`,
          ],
        };
      }

      const goalId =
        typeof rawGoal.id === 'string' ? rawGoal.id.trim() : '';
      const goalName =
        typeof rawGoal.name === 'string' ? rawGoal.name : '';
      const targetAmount =
        typeof rawGoal.targetAmount === 'number' ? rawGoal.targetAmount : NaN;
      const allocatedAmount =
        typeof rawGoal.allocatedAmount === 'number'
          ? rawGoal.allocatedAmount
          : NaN;
      const targetDate =
        rawGoal.targetDate !== undefined && rawGoal.targetDate !== null
          ? String(rawGoal.targetDate)
          : undefined;
      const note =
        rawGoal.note !== undefined && rawGoal.note !== null
          ? String(rawGoal.note)
          : undefined;
      const createdAt = isValidIsoTimestamp(rawGoal.createdAt)
        ? rawGoal.createdAt
        : record.exportedAt;
      const updatedAt = isValidIsoTimestamp(rawGoal.updatedAt)
        ? rawGoal.updatedAt
        : createdAt;

      let validatedGoal: SavingsGoal;
      try {
        validatedGoal = createSavingsGoal({
          id: goalId || undefined,
          name: goalName,
          targetAmount,
          allocatedAmount,
          targetDate,
          note,
          createdAt,
          updatedAt,
        });
      } catch (goalErr) {
        return {
          valid: false,
          errors: [
            `Target tabungan pada indeks #${i + 1} tidak valid: ${
              goalErr instanceof Error
                ? goalErr.message
                : 'Data target tabungan rusak.'
            }`,
          ],
        };
      }

      if (seenGoalIds.has(validatedGoal.id)) {
        return {
          valid: false,
          errors: [
            `Ditemukan duplikasi ID target tabungan "${validatedGoal.id}" dalam file cadangan.`,
          ],
        };
      }
      seenGoalIds.add(validatedGoal.id);
      validatedSavingsGoals.push(validatedGoal);
    }
  }

  // Validate optional debt/receivable records (schemaVersion 1–3 may omit debtRecords; schemaVersion 4 includes debtRecords)
  const validatedDebtRecords: DebtRecord[] = [];
  const seenDebtRecordIds = new Set<string>();

  if (record.debtRecords !== undefined) {
    if (!Array.isArray(record.debtRecords)) {
      return {
        valid: false,
        errors: [
          'Daftar catatan utang/piutang dalam cadangan tidak valid (harus berupa array).',
        ],
      };
    }

    for (let i = 0; i < record.debtRecords.length; i += 1) {
      const rawDebt = record.debtRecords[i] as
        | Record<string, unknown>
        | null
        | undefined;
      if (!rawDebt || typeof rawDebt !== 'object') {
        return {
          valid: false,
          errors: [
            `Catatan utang/piutang pada indeks #${i + 1} rusak atau bukan objek.`,
          ],
        };
      }

      const debtId =
        typeof rawDebt.id === 'string' ? rawDebt.id.trim() : '';
      const direction = rawDebt.direction as DebtRecord['direction'];
      const personName =
        typeof rawDebt.personName === 'string' ? rawDebt.personName : '';
      const amount =
        typeof rawDebt.amount === 'number' ? rawDebt.amount : NaN;
      const remainingAmount =
        typeof rawDebt.remainingAmount === 'number'
          ? rawDebt.remainingAmount
          : NaN;
      const dueDate =
        rawDebt.dueDate !== undefined && rawDebt.dueDate !== null
          ? String(rawDebt.dueDate)
          : undefined;
      const note =
        rawDebt.note !== undefined && rawDebt.note !== null
          ? String(rawDebt.note)
          : undefined;
      const createdAt = isValidIsoTimestamp(rawDebt.createdAt)
        ? rawDebt.createdAt
        : record.exportedAt;
      const updatedAt = isValidIsoTimestamp(rawDebt.updatedAt)
        ? rawDebt.updatedAt
        : createdAt;

      let validatedDebt: DebtRecord;
      try {
        validatedDebt = createDebtRecord({
          id: debtId || undefined,
          direction,
          personName,
          amount,
          remainingAmount,
          dueDate,
          note,
          createdAt,
          updatedAt,
        });
      } catch (debtErr) {
        return {
          valid: false,
          errors: [
            `Catatan utang/piutang pada indeks #${i + 1} tidak valid: ${
              debtErr instanceof Error
                ? debtErr.message
                : 'Data utang/piutang rusak.'
            }`,
          ],
        };
      }

      if (seenDebtRecordIds.has(validatedDebt.id)) {
        return {
          valid: false,
          errors: [
            `Ditemukan duplikasi ID catatan utang/piutang "${validatedDebt.id}" dalam file cadangan.`,
          ],
        };
      }
      seenDebtRecordIds.add(validatedDebt.id);
      validatedDebtRecords.push(validatedDebt);
    }
  }

  const sortedTransactions = sortTransactions(validatedTransactions, 'newest');
  const sortedBudgets = [...validatedBudgets].sort((a, b) =>
    a.categoryId.localeCompare(b.categoryId, 'id-ID'),
  );
  const sortedSavingsGoals = [...validatedSavingsGoals].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const sortedDebtRecords = [...validatedDebtRecords].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const archivedCategoryCount = completeCategories.filter((c) =>
    Boolean(c.archivedAt),
  ).length;

  const validatedPayload: NotaBackupPayload = {
    appName: NOTA_BACKUP_APP_NAME,
    schemaVersion: SUPPORTED_BACKUP_SCHEMA_VERSION,
    exportedAt: record.exportedAt,
    settings: validatedSettings,
    categories: completeCategories,
    transactions: sortedTransactions,
    budgets: sortedBudgets,
    savingsGoals: sortedSavingsGoals,
    debtRecords: sortedDebtRecords,
  };

  return {
    valid: true,
    preview: {
      payload: validatedPayload,
      rawJson: rawJsonSource ?? serializeBackupPayload(validatedPayload),
      summary: {
        schemaVersion: record.schemaVersion,
        exportedAt: validatedPayload.exportedAt,
        openingBalance: validatedSettings.openingBalance,
        currentBalance,
        totalIncome,
        totalExpense,
        transactionCount: sortedTransactions.length,
        categoryCount: completeCategories.length,
        archivedCategoryCount,
        budgetCount: sortedBudgets.length,
        savingsGoalCount: sortedSavingsGoals.length,
        debtRecordCount: sortedDebtRecords.length,
      },
    },
  };
}

function escapeCsvCell(value: string): string {
  // Prevent spreadsheet formula injection on leading =, +, -, @
  const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(safeValue)) {
    return `"${safeValue.replace(/"/g, '""')}"`;
  }
  return safeValue;
}

/**
 * Serializes transactions into a clean UTF-8 CSV string with Indonesian column headers.
 */
export function serializeTransactionsToCsv(
  transactions: readonly Transaction[],
  categories: readonly Category[],
): string {
  const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));
  const headers = [
    'ID Transaksi',
    'Tanggal',
    'Jenis',
    'Kategori',
    'Nominal (IDR)',
    'Catatan',
  ];

  const sorted = sortTransactions(transactions, 'newest');
  const rows = sorted.map((tx) => {
    const categoryName = categoryNameMap.get(tx.categoryId) ?? tx.categoryId;
    const jenisLabel = tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
    return [
      escapeCsvCell(tx.id),
      escapeCsvCell(tx.occurredAt),
      escapeCsvCell(jenisLabel),
      escapeCsvCell(categoryName),
      String(tx.amount),
      escapeCsvCell(tx.note ?? ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

