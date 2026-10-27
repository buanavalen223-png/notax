import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  X,
} from 'lucide-react';
import {
  MAX_TRANSACTION_NOTE_LENGTH,
  type Category,
  type Transaction,
  type TransactionDraft,
  type TransactionPatch,
  type TransactionType,
  getSelectableCategories,
} from '../../domain/transaction';
import { validateTransactionDraft } from '../../domain/validation';
import { toLocalDateString } from '../../lib/date';
import { formatIdrDigits, parseIdrInputDigits } from '../../lib/format';

export interface TransactionFormModalProps {
  mode: 'create' | 'edit';
  initialType?: TransactionType;
  editingTransaction?: Transaction;
  categories: readonly Category[];
  onCreate: (draft: TransactionDraft) => Promise<void>;
  onUpdate: (transactionId: string, patch: TransactionPatch) => Promise<void>;
  onClose: () => void;
}

function generateTransactionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `tx-${crypto.randomUUID()}`;
  }
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function TransactionFormModal({
  mode,
  initialType = 'expense',
  editingTransaction,
  categories,
  onCreate,
  onUpdate,
  onClose,
}: TransactionFormModalProps) {
  const formTitleId = useId();
  const amountInputId = useId();
  const categorySelectId = useId();
  const dateInputId = useId();
  const noteInputId = useId();
  const errorAlertId = useId();

  const amountInputRef = useRef<HTMLInputElement | null>(null);

  const [type, setType] = useState<TransactionType>(() =>
    mode === 'edit' && editingTransaction
      ? editingTransaction.type
      : initialType,
  );

  const selectableCategories = useMemo(
    () =>
      getSelectableCategories(
        categories,
        type,
        mode === 'edit' ? editingTransaction?.categoryId : undefined,
      ),
    [categories, type, mode, editingTransaction?.categoryId],
  );

  const [amountInput, setAmountInput] = useState<string>(() =>
    mode === 'edit' && editingTransaction
      ? formatIdrDigits(editingTransaction.amount)
      : '',
  );

  const [categoryId, setCategoryId] = useState<string>(() => {
    if (mode === 'edit' && editingTransaction) {
      return editingTransaction.categoryId;
    }
    const initialCats = getSelectableCategories(categories, initialType);
    return initialCats[0]?.id ?? '';
  });

  const [occurredAt, setOccurredAt] = useState<string>(() =>
    mode === 'edit' && editingTransaction
      ? editingTransaction.occurredAt
      : toLocalDateString(new Date()),
  );

  const [note, setNote] = useState<string>(() =>
    mode === 'edit' && editingTransaction
      ? (editingTransaction.note ?? '')
      : '',
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    amountInputRef.current?.focus();
  }, []);

  function handleTypeChange(nextType: TransactionType) {
    if (nextType === type || isSubmitting) {
      return;
    }
    setType(nextType);
    setErrorMessage(null);

    const nextSelectable = getSelectableCategories(
      categories,
      nextType,
      mode === 'edit' ? editingTransaction?.categoryId : undefined,
    );
    const stillValid = nextSelectable.some((cat) => cat.id === categoryId);
    if (!stillValid) {
      setCategoryId(nextSelectable[0]?.id ?? '');
    }
  }

  function handleAmountChange(rawValue: string) {
    setErrorMessage(null);
    const parsed = parseIdrInputDigits(rawValue);
    if (parsed === null) {
      setAmountInput('');
      return;
    }
    setAmountInput(formatIdrDigits(parsed));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setErrorMessage(null);
    const parsedAmount = parseIdrInputDigits(amountInput);

    const candidateId =
      mode === 'edit' && editingTransaction
        ? editingTransaction.id
        : generateTransactionId();

    const candidateDraft: Partial<TransactionDraft> = {
      id: candidateId,
      type,
      amount: parsedAmount ?? 0,
      categoryId,
      occurredAt,
      note,
    };

    const validation = validateTransactionDraft(candidateDraft, categories, {
      allowArchivedCategoryId:
        mode === 'edit' ? editingTransaction?.categoryId : undefined,
    });

    if (!validation.valid) {
      setErrorMessage(validation.errors[0]);
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'edit' && editingTransaction) {
        await onUpdate(editingTransaction.id, {
          type,
          amount: parsedAmount!,
          categoryId,
          occurredAt,
          note,
        });
      } else {
        await onCreate({
          id: candidateId,
          type,
          amount: parsedAmount!,
          categoryId,
          occurredAt,
          note,
        });
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Gagal menyimpan transaksi ke penyimpanan lokal.',
      );
      setIsSubmitting(false);
    }
  }

  const isEditMode = mode === 'edit';
  const headingText = isEditMode
    ? 'Edit transaksi'
    : type === 'income'
      ? 'Tambah pemasukan'
      : 'Tambah pengeluaran';

  return (
    <section
      aria-labelledby={formTitleId}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !isSubmitting) {
          e.stopPropagation();
          onClose();
        }
      }}
      className="rounded-hero border border-nota-emerald/30 bg-nota-surface p-5 sm:p-6 space-y-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2
            id={formTitleId}
            className="text-base sm:text-lg font-semibold tracking-tight text-nota-ink"
          >
            {headingText}
          </h2>
          <p className="text-xs text-nota-muted">
            {isEditMode
              ? 'Perbarui detail transaksi. Perubahan akan langsung memperbarui saldo dan ringkasan.'
              : 'Catat transaksi baru dalam Rupiah (IDR).'}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Tutup formulir transaksi"
          className="inline-flex h-8 w-8 items-center justify-center rounded-control border border-nota-border bg-nota-bg text-nota-muted hover:text-nota-ink transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Transaction Type Selector */}
        <fieldset className="space-y-1.5">
          <legend className="block text-xs font-medium text-nota-ink">
            Jenis transaksi
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              aria-pressed={type === 'income'}
              disabled={isSubmitting}
              className={`inline-flex items-center justify-center gap-1.5 rounded-control border px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                type === 'income'
                  ? 'border-nota-emerald bg-nota-soft-green text-nota-emerald font-semibold'
                  : 'border-nota-border bg-nota-bg text-nota-muted hover:text-nota-ink'
              }`}
            >
              <ArrowDownLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              Pemasukan
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              aria-pressed={type === 'expense'}
              disabled={isSubmitting}
              className={`inline-flex items-center justify-center gap-1.5 rounded-control border px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                type === 'expense'
                  ? 'border-nota-expense/50 bg-nota-expense-soft text-nota-expense font-semibold'
                  : 'border-nota-border bg-nota-bg text-nota-muted hover:text-nota-ink'
              }`}
            >
              <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              Pengeluaran
            </button>
          </div>
        </fieldset>

        {/* Main Fields Grid: Amount, Category, Date */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
          {/* Amount (IDR) */}
          <div className="sm:col-span-5 space-y-1.5">
            <label
              htmlFor={amountInputId}
              className="block text-xs font-medium text-nota-ink"
            >
              Nominal transaksi (IDR)
            </label>
            <div className="relative flex items-center">
              <span
                className="pointer-events-none absolute left-3.5 text-sm font-semibold text-nota-muted select-none"
                aria-hidden="true"
              >
                Rp
              </span>
              <input
                ref={amountInputRef}
                id={amountInputId}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={amountInput}
                onChange={(e) => handleAmountChange(e.target.value)}
                disabled={isSubmitting}
                aria-invalid={errorMessage ? 'true' : 'false'}
                aria-describedby={errorMessage ? errorAlertId : undefined}
                className="w-full rounded-control border border-nota-border bg-nota-bg py-2.5 pl-10 pr-3.5 text-base font-semibold text-nota-ink tabular-nums placeholder:text-nota-muted/50 focus:border-nota-emerald focus:bg-nota-surface"
              />
            </div>
          </div>

          {/* Category */}
          <div className="sm:col-span-4 space-y-1.5">
            <label
              htmlFor={categorySelectId}
              className="block text-xs font-medium text-nota-ink"
            >
              Kategori transaksi
            </label>
            <select
              id={categorySelectId}
              value={categoryId}
              onChange={(e) => {
                setErrorMessage(null);
                setCategoryId(e.target.value);
              }}
              disabled={isSubmitting}
              className="w-full rounded-control border border-nota-border bg-nota-bg px-3.5 py-2.5 text-sm font-medium text-nota-ink focus:border-nota-emerald focus:bg-nota-surface"
            >
              {selectableCategories.length === 0 ? (
                <option value="">Pilih kategori</option>
              ) : null}
              {selectableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                  {cat.archivedAt ? ' (Diarsipkan)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="sm:col-span-3 space-y-1.5">
            <label
              htmlFor={dateInputId}
              className="block text-xs font-medium text-nota-ink"
            >
              Tanggal transaksi
            </label>
            <input
              id={dateInputId}
              type="date"
              value={occurredAt}
              onChange={(e) => {
                setErrorMessage(null);
                setOccurredAt(e.target.value);
              }}
              disabled={isSubmitting}
              className="w-full rounded-control border border-nota-border bg-nota-bg px-3.5 py-2.5 text-sm font-medium text-nota-ink tabular-nums focus:border-nota-emerald focus:bg-nota-surface"
            />
          </div>
        </div>

        {/* Optional Note */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor={noteInputId}
              className="block text-xs font-medium text-nota-ink"
            >
              Catatan transaksi (opsional)
            </label>
            <span className="text-[11px] text-nota-muted tabular-nums">
              {note.trim().length}/{MAX_TRANSACTION_NOTE_LENGTH}
            </span>
          </div>
          <input
            id={noteInputId}
            type="text"
            placeholder="Contoh: Makan siang bersama klien, Gaji bulanan..."
            value={note}
            onChange={(e) => {
              setErrorMessage(null);
              setNote(e.target.value);
            }}
            disabled={isSubmitting}
            className="w-full rounded-control border border-nota-border bg-nota-bg px-3.5 py-2 text-sm text-nota-ink placeholder:text-nota-muted/60 focus:border-nota-emerald focus:bg-nota-surface"
          />
        </div>

        {/* Validation or Storage Error Feedback */}
        {errorMessage ? (
          <div
            id={errorAlertId}
            role="alert"
            className="flex items-start gap-2 rounded-panel border border-nota-expense/30 bg-nota-expense-soft px-3.5 py-2.5 text-xs text-nota-expense"
          >
            <AlertCircle
              className="h-4 w-4 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-control border border-nota-border bg-nota-bg px-4 py-2 text-xs sm:text-sm font-medium text-nota-ink hover:bg-nota-surface transition-colors cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-1.5 rounded-control bg-nota-emerald px-5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-nota-emerald-hover transition-colors cursor-pointer disabled:opacity-55"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {isSubmitting
              ? 'Menyimpan...'
              : isEditMode
                ? 'Simpan perubahan'
                : 'Simpan transaksi'}
          </button>
        </div>
      </form>
    </section>
  );
}

