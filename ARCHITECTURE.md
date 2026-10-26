# Architecture Decision Record: Nota

**Status:** Target architecture proposal  
**Prinsip:** SPA local-first, tanpa backend untuk fungsi inti.

## 1. Rekomendasi stack

### Keputusan utama

| Lapisan | Pilihan awal | Alasan |
|---|---|---|
| Web app | React + TypeScript | Ekosistem matang, tipe membantu mengurangi bug domain, cocok untuk komponen UI interaktif. |
| Build/dev | Vite | Dev server dan HMR cepat, build SPA statis dan keluaran production yang dioptimalkan. |
| Styling | Tailwind CSS v4 | Styling langsung pada komponen, token visual terpusat, tanpa runtime styling besar. |
| UI primitives | shadcn/ui secara selektif + Radix primitives bila diperlukan | Komponen dapat disesuaikan dan dimiliki di repo, tidak harus menerima desain default seluruh kit. Jangan memasang semua komponen. |
| Icons | Lucide React | Gaya ikon konsisten. |
| Local database | IndexedDB melalui Dexie | Data keuangan terstruktur, async persistence, indeks, dan migrasi skema. |
| React bindings | `dexie-react-hooks`/`useLiveQuery` bila dibutuhkan | Membuat UI bereaksi pada perubahan DB lokal tanpa custom subscription yang rapuh. |
| Form validation | Zod; React Hook Form hanya bila form mulai kompleks | Validasi data konsisten. Jangan menambah form abstraction untuk satu input sederhana. |
| Charting | Mulai dari SVG/CSS sederhana; gunakan Recharts secara selektif dan lazy-loaded jika analitik memerlukannya | Menekan beban awal dan menghindari chart dekoratif. |
| Unit/integration tests | Vitest + Testing Library | Dekat dengan toolchain Vite dan mendukung pengujian domain/komponen. |
| End-to-end | Playwright | Menguji alur pengguna di browser pada viewport berbeda. |
| Package manager | npm | Pilihan sederhana untuk pemula dan agent; jangan mengombinasikan beberapa package manager. |
| Deployment | Static hosting, opsional | Build inti dapat disajikan sebagai file statis; tidak membutuhkan backend. |

### Mengapa bukan full-stack framework dahulu?

Nota tidak membutuhkan server rendering, route loaders dari backend, session login, atau API backend untuk fitur inti. React + Vite sebagai SPA statis adalah pilihan yang lebih sederhana untuk constraint local-first ini. Jika kebutuhan berubah menjadi sinkronisasi, berbagi data, atau AI berbasis provider eksternal, arsitektur backend dapat dinilai ulang secara eksplisit. Ini keputusan berdasarkan scope Nota, bukan klaim bahwa Vite selalu lebih baik dari framework lain.

## 2. Prinsip performa

Tidak ada framework yang otomatis menjamin aplikasi bebas lag. Performa harus dijaga melalui batas dependency, desain state, pengukuran, dan pengujian pada perangkat nyata.

- Gunakan versi stabil yang kompatibel pada saat scaffold. Catat versi Node/npm dan lockfile.
- Hindari dependency yang duplikatif dan library UI besar yang tidak dibutuhkan.
- Lazy-load halaman analitik dan visualisasi yang bukan bagian dari initial view.
- Jangan menjalankan agregasi besar berulang kali saat render. Gunakan query terukur dan memoization hanya jika profiling membuktikannya perlu.
- Jangan memuat ribuan transaksi sekaligus di daftar. Tambahkan pagination/virtualization hanya saat volume data dan profil performa membutuhkannya.
- Gunakan CSS/SVG untuk visual sederhana, bukan canvas/chart bundle besar tanpa kebutuhan.
- Hindari font remote sebagai ketergantungan awal; gunakan system stack atau self-hosted font setelah mengevaluasi ukurannya.
- Gunakan production build untuk evaluasi, bukan hanya dev server.
- Ukur dengan browser performance tools dan Lighthouse; jangan mengklaim "anti-lag" tanpa hasil ukur.

### Target awal yang perlu diuji

- Tidak ada network request wajib saat membuka dashboard pertama kali setelah asset app tersedia.
- First render memunculkan struktur inti tanpa menunggu chart atau fitur opsional.
- Target awal initial JavaScript <= 250 kB gzip, lalu ukur bundle nyata dan revisi batas jika ada alasan yang jelas. Ini target engineering, bukan jaminan sebelum pengukuran.
- Interaksi tambah transaksi terasa langsung pada volume data realistis.
- Tidak ada long task yang berasal dari kalkulasi biasa dashboard.
- Layout tidak bergeser besar ketika font/data muncul.

## 3. Local-first storage

### Pilihan: IndexedDB + Dexie

Simpan data finansial di IndexedDB. Jangan memakai `localStorage` sebagai database transaksi; `localStorage` dapat dipakai secara terbatas untuk preferensi sederhana jika benar-benar diperlukan. Data finansial harus melewati repository/data-access layer, bukan diakses langsung dari komponen presentasi.

Dexie dipilih sebagai wrapper yang memudahkan operasi terstruktur, indeks, transaksi, dan schema versioning di atas IndexedDB. Tetap uji persistence dan migration behaviour pada browser yang didukung.

### Data store konseptual

MVP:
- `transactions`
- `categories`
- `settings`

P1 bila dibutuhkan:
- `budgets`
- `savingsGoals`
- `recurringItems`
- `debtRecords`

Jangan membuat `users`, `profiles`, `bankAccounts`, `wallets`, `cards`, `bankConnections`, atau tabel transfer pada MVP.

### Repository boundary

UI -> application/domain service -> repository interface -> Dexie implementation.

Komponen React tidak boleh melakukan query Dexie ad hoc di berbagai tempat. Buat fungsi domain untuk menambah, mengedit, menghapus transaksi, menghitung ringkasan, impor, dan ekspor. Buat repository abstraction secukupnya; jangan membangun framework internal berlebihan.

### Contoh struktur folder

```text
src/
  app/
    App.tsx
    router.tsx
  components/
    ui/
    layout/
    feedback/
  features/
    overview/
    transactions/
    categories/
    analytics/        # lazy-loaded setelah milestone terkait
    planning/         # setelah fitur disetujui
  domain/
    money.ts
    transaction.ts
    summaries.ts
    validation.ts
  data/
    db.ts
    repositories/
    migrations/
    backup/
  hooks/
  lib/
    date.ts
    format.ts
  styles/
  test/
```

Sesuaikan struktur jika ukuran proyek masih kecil. Jangan membuat folder abstraksi tanpa kebutuhan.

## 4. Model keuangan

### Amount representation

- Simpan nominal IDR sebagai integer positif.
- Jangan simpan `"Rp 1.000"` sebagai nilai domain.
- Format tampilan memakai `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })`.
- Validasi integer aman dan batas nilai yang masuk akal.

### Balance

`currentBalance = openingBalance + sum(income.amount) - sum(expense.amount)`

`openingBalance` mewakili saldo awal sebelum semua riwayat transaksi yang dimasukkan ke Nota. Ia bukan pemasukan bulan ini.

### Date handling

- Simpan timestamps ISO untuk audit `createdAt`/`updatedAt`.
- Untuk transaksi, simpan representasi tanggal kejadian yang tidak menimbulkan pergeseran hari karena UTC; tetapkan strategi konsisten, misalnya date-only `YYYY-MM-DD` untuk transaksi harian dan gunakan local date pada UI.
- Buat helper periode awal/akhir bulan serta batas filter yang sudah diuji.
- Jangan membangun tanggal lokal hanya dari `new Date('YYYY-MM-DD')` tanpa memikirkan perbedaan zona waktu browser.

### Atomicity

Operasi edit/hapus/backup yang melibatkan beberapa record harus memakai transaksi IndexedDB/Dexie apabila diperlukan. Bila menambah transaksi gagal, jangan memperbarui UI seolah data persisten.

## 5. Backup dan restore

- Format backup JSON memiliki `appName`, `schemaVersion`, `exportedAt`, `settings`, `categories`, dan `transactions`.
- Validasi tipe data, jumlah data, nominal, enum, dan tanggal sebelum import.
- Tampilkan jumlah record serta mode tindakan sebelum konfirmasi.
- MVP hanya mendukung replace dengan konfirmasi eksplisit; buat backup saat ini terlebih dahulu atau minta pengguna mengekspornya sebelum replace.
- Jika proses import gagal, rollback melalui transaksi DB; jangan meninggalkan setengah data jika bisa dihindari.
- Jangan mengunggah backup otomatis ke server.
- Jelaskan bahwa backup memuat data keuangan sensitif dan harus disimpan secara aman oleh pengguna.

## 6. Batas privasi dan keamanan

- Data inti tetap di perangkat/browser dan tidak dikirim ke server.
- IndexedDB pada browser tidak otomatis terenkripsi. Jangan menyebut data terenkripsi atau terlindung dari pengguna lain yang memiliki akses ke profil browser.
- XSS tetap relevan: hindari `dangerouslySetInnerHTML`, sanitasi teks bila ada konteks HTML, dan gunakan dependency tepercaya.
- Tidak ada API secret di frontend.
- AI eksternal tidak termasuk pada MVP. Tanpa backend, API key provider tidak boleh ditanam di client. Jika AI eksternal kelak disetujui, pilih secara terbuka antara service backend yang melindungi secret atau model lokal/browser yang sesuai, serta minta persetujuan sebelum data finansial dikirim keluar.
- Tidak ada analytics/telemetry pihak ketiga secara default.

## 7. Strategi routing dan state

- Gunakan React Router atau routing sederhana yang sesuai jumlah halaman; hindari menambahkan dua router.
- Data persisten berasal dari Dexie.
- State UI (modal terbuka, filter, tab) lokal di React; preferensi yang perlu bertahan disimpan dalam settings secara terukur.
- TanStack Query tidak diperlukan untuk data transaksi lokal pada MVP karena itu adalah server-state library. Pertimbangkan hanya jika ada kebutuhan fetch/cache remote yang nyata di masa depan.
- Jangan menyimpan daftar transaksi sebagai satu sumber data global di memori sementara yang terpisah dari database.

## 8. Testing

- Vitest untuk rumus saldo, agregasi periode, validasi, import/export, dan date boundaries.
- Testing Library untuk perilaku form dan komponen interaktif yang penting.
- Playwright untuk alur utama: onboarding, tambah pemasukan, tambah pengeluaran, edit, hapus, reload persistence, backup/restore, serta viewport mobile/desktop.
- Periksa kesalahan console dan network request yang tidak diharapkan.
- Gunakan data fixture hanya dalam test/dev; jangan campurkan transaksi demo pada data pengguna produksi.

## 9. Architecture acceptance criteria

- Build sebagai SPA statis.
- Fungsi inti berjalan tanpa server/network.
- Tidak ada auth, cloud DB, wallet, atau bank integration.
- Seluruh akses data lewat lapisan data/domain yang jelas.
- Perhitungan finansial teruji.
- Restore tervalidasi dan tidak menimpa data tanpa persetujuan.
- Analitik dan modul opsional tidak menambah beban awal secara tidak perlu.
- Versi library serta hasil build/test dicatat pada handoff.

## 10. Keputusan yang perlu persetujuan eksplisit jika scope berubah

- Sinkronisasi lintas perangkat/cloud.
- AI API eksternal.
- Enkripsi backup atau app lock.
- Banyak mata uang.
- Multi-account/wallet virtual.
- Fitur akuntansi yang lebih kompleks.
