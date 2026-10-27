# HANDOFF — Nota (Manajemen Keuangan Masjid)

## Current status

- **Date / Milestone:** 2026-10-28 — **Milestone M3 (`Jurnal Transaksi Masjid, Filter Multi-Dimensi, & Konfirmasi Soft Guard`) Completed**.
- **Product name:** Nota (Manajemen Keuangan Masjid Local-First).
- **Phase:** Milestone M1, Milestone M2, dan Milestone M3 telah selesai diimplementasikan dan terverifikasi penuh. Formulir transaksi masjid (`TransactionFormModal`) kini mendukung pemilihan Lokasi Kas (`accountId`), Dana Masjid (`fundId` — otomatis terisi dari `defaultFundId` kategori masjid namun dapat diubah), Pos RAB opsional (`budgetPlanId`), Donatur/Penerima (`donorOrPayee`), Nomor Bukti/Referensi (`referenceNo`), serta evaluasi dan konfirmasi bendahara **Soft Guard** (`evaluateTransactionSoftGuard`). Daftar transaksi (`TransactionListSection`) dan transaksi terakhir pada `Ringkasan` kini menampilkan badge Dana & Lokasi Kas serta filter berdasarkan Lokasi Kas dan Dana Masjid. Siap melanjutkan ke **Milestone M4 (`Anggaran / RAB Masjid & Realisasi Anggaran`)**.
- **Toolchain recorded:** Node `v26.11.1`, npm `11.20.0`, React `^19.1.0`, Vite `^6.3.1` (resolved `6.4.5`), Tailwind CSS v4 (`@tailwindcss/vite` `^4.1.4`), TypeScript `~5.8.3`, Dexie `^4.0.11`, Vitest `^3.1.1` (resolved `3.2.7`), `fake-indexeddb` `^6.0.0`, Lucide React `^1.0.0`.

## Pekerjaan yang Selesai pada Milestone M3

1. **Formulir Transaksi Masjid & Konfirmasi Soft Guard (`src/features/transactions/TransactionFormModal.tsx`)**:
   - Menambahkan pemilih **Lokasi kas transaksi (`accountId`)** yang mengutamakan `Kas Tunai` (`acc-kas-tunai`) sebagai bawaan.
   - Menambahkan pemilih **Dana masjid (`fundId`)** lengkap dengan label sifat dana (`Dana Umum` vs `Dana Terikat`) serta pemetaan otomatis (`defaultFundId`) saat kategori transaksi dipilih.
   - Menambahkan pemilih opsional **Pos RAB / Anggaran (`budgetPlanId`)** untuk pengeluaran ketika data RAB tersedia.
   - Menambahkan input opsional **Donatur / Penerima (`donorOrPayee`)** dan **Nomor bukti / referensi (`referenceNo`)**.
   - Mengintegrasikan **Banner Peringatan & Konfirmasi Soft Guard** (`evaluateTransactionSoftGuard`) untuk pengeluaran masjid yang melebihi saldo Dana (`FUND_DEFICIT`), melebihi saldo Lokasi Kas (`ACCOUNT_DEFICIT`), atau menggunakan Dana Terikat untuk kategori di luar peruntukannya (`RESTRICTED_FUND_CATEGORY_MISMATCH`), lengkap dengan kotak centang konfirmasi bendahara dan tombol konfirmasi eksplisit sebelum transaksi disimpan.
2. **Daftar Transaksi Masjid & Filter Multi-Dimensi (`src/features/transactions/TransactionListSection.tsx` & `src/features/overview/OverviewFoundationPage.tsx`)**:
   - Menampilkan badge **Dana Masjid (`fundId`)** dan **Lokasi Kas (`accountId`)** pada setiap baris transaksi di halaman `Transaksi` maupun daftar transaksi terakhir di halaman `Ringkasan`, beserta informasi `donorOrPayee` dan `#referenceNo`.
   - Menambahkan dropdown **Filter dana masjid** dan **Filter lokasi kas** pada `TransactionListSection`, terintegrasi dengan pencarian kata kunci (`note`, nama kategori, `donorOrPayee`, `referenceNo`) dan tombol `Reset filter`.
3. **Pengujian Integrasi Milestone M3 (`src/test/mosqueTransactions.test.tsx`)**:
   - Menguji pemilihan otomatis `fundId` dari kategori masjid serta penyimpanan `accountId`, `fundId`, `donorOrPayee`, dan `referenceNo`.
   - Menguji alur peringatan dan konfirmasi bendahara **Soft Guard** (`ACCOUNT_DEFICIT` & `RESTRICTED_FUND_CATEGORY_MISMATCH`).
   - Menguji penyaringan transaksi berdasarkan `Filter dana masjid`, `Filter lokasi kas`, serta pencarian `donorOrPayee` dan `referenceNo`.

## File yang Dibuat / Dimodifikasi pada Milestone M3

- `src/domain/mosque.ts` (dimodifikasi — Pengurutan `Kas Tunai` sebagai urutan utama pada `getSelectableCashAccounts`)
- `src/features/transactions/TransactionFormModal.tsx` (dimodifikasi — Input `accountId`, `fundId`, `budgetPlanId`, `donorOrPayee`, `referenceNo`, dan konfirmasi Soft Guard)
- `src/features/transactions/TransactionListSection.tsx` (dimodifikasi — Filter Dana Masjid & Lokasi Kas serta badge transaksi masjid)
- `src/features/overview/OverviewFoundationPage.tsx` (dimodifikasi — Integrasi properti kas/dana ke `TransactionFormModal` & `TransactionListSection`, serta badge pada transaksi terakhir di `Ringkasan`)
- `src/test/mosqueTransactions.test.tsx` (dibuat — Pengujian integrasi transaksi masjid, filter kas/dana, dan Soft Guard)
- `HANDOFF.md` (dimodifikasi)

## Pengujian & Verifikasi yang Dijalankan

- `npm.cmd run typecheck` (`tsc -b --noEmit`) — **LULUS (exit code 0)**.
- `npm.cmd run lint` (`eslint .`) — **LULUS (exit code 0)**.
- `npm.cmd run test` (`vitest run`) — **LULUS (13 file uji, 67 pengujian lulus)**.
- `npm.cmd run build` (`tsc -b && vite build`) — **LULUS (exit code 0)**.

## Isu yang Diketahui / Risiko Tersisa

- Tab `Anggaran / RAB` saat ini masih menampilkan komponen perencanaan lama dan akan digantikan/diperluas dengan manajemen **Anggaran / RAB Masjid (`BudgetPlan` per Dana & Kategori beserta realisasi anggaran)** pada **Milestone M4**.
- Tab `Laporan` saat ini menampilkan ringkasan awal dan akan dilengkapi dengan tabel pertanggungjawaban kas per Dana & Lokasi Kas, ekspor CSV, serta tata letak cetak pengumuman jamaah (`@media print`) pada **Milestone M5**.

## Langkah Selanjutnya yang Direkomendasikan

- Lanjutkan ke **Milestone M4 — Halaman `Anggaran / RAB` Masjid & Realisasi Anggaran**:
  1. Membuat komponen manajemen **RAB / Anggaran Masjid (`BudgetPlan`)** pada tab `Anggaran / RAB` yang terhubung dengan periode (`YYYY-MM`), Dana (`fundId`), Kategori pengeluaran (`categoryId`), nominal rencana (`plannedAmount`), dan catatan kegiatan.
  2. Menampilkan progres realisasi anggaran (`calculateBudgetRealizations`) dari transaksi pengeluaran yang terjadi pada periode/dana/kategori atau yang ditautkan langsung melalui `budgetPlanId`.
