import { type FormEvent, useState } from 'react';
import { AlertCircle, ShieldCheck, X } from 'lucide-react';
import { MAX_IDR_AMOUNT, isValidOpeningBalance } from '../../domain/money';
import { formatIDR, formatIdrDigits, parseIdrInputDigits } from '../../lib/format';

interface OpeningBalanceSetupProps {
  /** Current opening balance in integer IDR */
  initialOpeningBalance: number;
  /** True if this is the first-run onboarding flow; false if editing later */
  isFirstRun: boolean;
  /** Async handler that persists the opening balance via the repository */
  onSave: (openingBalance: number) => Promise<void>;
  /** Optional cancel handler when editing an already-completed setup */
  onCancel?: () => void;
}

export function OpeningBalanceSetup({
  initialOpeningBalance,
  isFirstRun,
  onSave,
  onCancel,
}: OpeningBalanceSetupProps) {
  const [rawInput, setRawInput] = useState<string>(
    initialOpeningBalance > 0 ? formatIdrDigits(initialOpeningBalance) : '0',
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parsedValue = parseIdrInputDigits(rawInput);

  function handleInputChange(value: string) {
    setErrorMessage(null);
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length === 0) {
      setRawInput('');
      return;
    }
    const numeric = Number(digitsOnly);
    if (Number.isSafeInteger(numeric) && numeric <= MAX_IDR_AMOUNT) {
      setRawInput(formatIdrDigits(numeric));
    }
  }

  async function submitOpeningBalance(candidateAmount: number | null) {
    setErrorMessage(null);

    if (candidateAmount === null || !isValidOpeningBalance(candidateAmount)) {
      setErrorMessage(
        'Masukkan nominal saldo awal berupa bilangan bulat Rupiah (0 atau lebih besar).',
      );
      return;
    }

    setIsSaving(true);
    try {
      await onSave(candidateAmount);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Gagal menyimpan saldo awal ke penyimpanan lokal browser.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidateAmount = rawInput.trim() === '' ? 0 : parsedValue;
    await submitOpeningBalance(candidateAmount);
  }

  return (
    <section
      aria-labelledby="opening-balance-heading"
      className="rounded-hero bg-nota-surface p-6 sm:p-7 border border-nota-border/80 space-y-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2
            id="opening-balance-heading"
            className="text-lg sm:text-xl font-semibold tracking-tight text-nota-ink"
          >
            {isFirstRun
              ? 'Atur saldo awal catatan Anda'
              : 'Ubah saldo awal catatan'}
          </h2>
          <p className="text-xs sm:text-sm text-nota-muted max-w-2xl">
            Saldo awal menjadi titik mulai sebelum transaksi dihitung dan tidak
            masuk sebagai pemasukan bulan berjalan.
          </p>
        </div>

        {!isFirstRun && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            aria-label="Tutup pengaturan saldo awal"
            className="inline-flex items-center gap-1.5 rounded-control border border-nota-border bg-nota-bg px-3.5 py-1.5 text-xs font-medium text-nota-ink hover:bg-nota-soft-green/50 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Batal
          </button>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="w-full sm:max-w-xs space-y-1.5">
            <label
              htmlFor="opening-balance-input"
              className="block text-xs font-medium text-nota-muted"
            >
              Nominal saldo awal (IDR)
            </label>
            <div className="relative flex items-center">
              <span
                className="pointer-events-none absolute left-4 text-sm font-semibold text-nota-muted select-none"
                aria-hidden="true"
              >
                Rp
              </span>
              <input
                id="opening-balance-input"
                name="openingBalance"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                disabled={isSaving}
                value={rawInput}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="0"
                aria-describedby={
                  errorMessage
                    ? 'opening-balance-hint opening-balance-error'
                    : 'opening-balance-hint'
                }
                aria-invalid={errorMessage ? 'true' : 'false'}
                className="w-full rounded-panel border border-nota-border bg-nota-bg py-2.5 pl-11 pr-4 text-lg font-semibold text-nota-ink tabular-nums placeholder:text-nota-muted/60 focus:border-nota-emerald focus:bg-nota-surface"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-control bg-nota-emerald px-5 py-2.5 text-sm font-semibold text-white hover:bg-nota-emerald-hover disabled:opacity-60 transition-colors cursor-pointer"
            >
              {isSaving
                ? 'Menyimpan...'
                : isFirstRun
                  ? 'Simpan & mulai gunakan Nota'
                  : 'Simpan saldo awal'}
            </button>

            {isFirstRun ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setRawInput('0');
                  void submitOpeningBalance(0);
                }}
                className="inline-flex items-center justify-center rounded-control border border-nota-border bg-nota-bg px-4 py-2.5 text-sm font-medium text-nota-ink hover:bg-nota-soft-green/50 disabled:opacity-60 transition-colors cursor-pointer"
              >
                Mulai dari Rp 0
              </button>
            ) : null}
          </div>
        </div>

        <p id="opening-balance-hint" className="text-xs text-nota-muted">
          Pratinjau:{' '}
          <span className="font-medium text-nota-ink tabular-nums">
            {formatIDR(parsedValue ?? 0)}
          </span>
        </p>

        {errorMessage ? (
          <div
            id="opening-balance-error"
            role="alert"
            className="flex items-center gap-2 rounded-badge bg-nota-expense-soft px-4 py-3 text-xs font-medium text-nota-expense border border-nota-expense/20 max-w-md"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        ) : null}
      </form>

      {/* Single concise local-privacy explanation located only inside setup/settings */}
      <div className="flex items-center gap-2 pt-3 border-t border-nota-border/60 text-xs text-nota-muted">
        <ShieldCheck
          className="h-4 w-4 text-nota-emerald shrink-0"
          aria-hidden="true"
        />
        <span>
          Data disimpan secara lokal di browser perangkat ini tanpa akun dan
          tanpa koneksi bank.
        </span>
      </div>
    </section>
  );
}
