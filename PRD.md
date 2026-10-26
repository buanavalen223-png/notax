# PRD: Nota

**Versi:** 0.1 (blueprint awal)  
**Status:** Draft untuk diimplementasikan bertahap  
**Nama produk:** Nota  
**Kategori:** Personal finance manager, local-first web app  
**Bahasa antarmuka:** Bahasa Indonesia  
**Mata uang awal:** Rupiah Indonesia (IDR)

## 1. Ringkasan produk

Nota adalah aplikasi untuk satu orang yang ingin melihat kondisi keuangan secara cepat dan mencatat pemasukan/pengeluaran tanpa proses rumit. Nota menyajikan saldo virtual, ringkasan periode, transaksi, dan insight sederhana dengan desain premium minimalis yang terinspirasi referensi visual yang disertakan.

Nota bukan aplikasi perbankan. Semua data rekening/uang yang ada hanyalah catatan virtual yang dimasukkan pengguna. Produk inti harus dapat dipakai tanpa akun pengguna, tanpa server, tanpa integrasi bank, dan tanpa provider AI.

## 2. Masalah pengguna

- Sulit melihat pemasukan, pengeluaran, dan perubahan saldo secara ringkas.
- Aplikasi keuangan sering terasa padat, penuh kartu, atau mengharuskan pengaturan yang terlalu banyak.
- Mencatat transaksi membutuhkan terlalu banyak langkah.
- Pengguna ingin menyimpan catatan keuangan pribadi di perangkat dan tetap dapat mencadangkannya.

## 3. Sasaran dan prinsip produk

### Sasaran
1. Pengguna memahami kondisi keuangan dalam beberapa detik setelah membuka dashboard.
2. Pengguna dapat mencatat pemasukan atau pengeluaran tanpa melewati alur yang panjang.
3. Perubahan transaksi memperbarui ringkasan dan saldo dengan benar.
4. Antarmuka konsisten dan nyaman pada layar laptop maupun HP.
5. Data tetap tersedia setelah browser ditutup/dibuka kembali, selama data situs/browser tidak dihapus.
6. Pengguna dapat mengekspor backup dan memulihkannya dengan alur yang terkontrol.

### Bukan sasaran
- Login, registrasi, multi-user, profil, atau role/permission.
- Koneksi ke rekening bank asli, kartu, e-wallet, atau payment gateway.
- Transfer uang sungguhan atau perpindahan saldo antar-wallet.
- Sinkronisasi cloud atau lintas perangkat pada versi inti.
- Rekomendasi investasi, perpajakan, atau klaim sebagai penasihat keuangan profesional.
- AI sebagai syarat agar fitur utama berfungsi.

## 4. Pengguna utama

Satu individu yang mencatat pemasukan dan pengeluaran pribadi. Diasumsikan pengguna menginginkan aplikasi yang intuitif dan tidak membutuhkan pengetahuan akuntansi.

## 5. Ruang lingkup fitur

### 5.1 P0: inti MVP

#### Dashboard / Ringkasan
- Menampilkan saldo virtual saat ini.
- Menampilkan total pemasukan dan pengeluaran untuk periode terpilih.
- Menampilkan selisih pemasukan dikurangi pengeluaran pada periode tersebut.
- Periode ringkasan default: bulan ini; sediakan pemilih periode yang mudah ditemukan.
- Menampilkan sejumlah kecil transaksi terbaru dengan tautan ke daftar transaksi.
- Menampilkan satu grafik atau visual sederhana jika benar-benar membantu memahami arus uang.
- Memiliki tindakan jelas untuk menambah pemasukan dan pengeluaran.
- Memiliki empty state yang ramah ketika belum ada transaksi.

#### Transaksi
- Jenis transaksi: pemasukan atau pengeluaran.
- Data transaksi minimum: ID, jenis, nominal, kategori, tanggal kejadian, catatan opsional, waktu dibuat, waktu diperbarui.
- Tambah, lihat, edit, dan hapus transaksi.
- Validasi nominal lebih besar dari nol.
- Pencarian kata kunci dan filter periode, jenis, kategori.
- Pengurutan terbaru/terlama.
- Dialog konfirmasi saat menghapus.
- Form cepat dengan fokus ke nominal, kategori, dan tanggal.
- Tanggal default adalah tanggal lokal hari ini.
- Format tanggal dan nominal dalam bahasa Indonesia.

#### Saldo virtual
- Pengguna mengatur saldo awal saat setup atau dari pengaturan.
- Saldo awal adalah angka awal sebelum seluruh transaksi yang dicatat di Nota.
- Tidak ada entitas rekening/wallet, nomor rekening, kartu, maupun transfer antar-rekening.
- Rumus saldo: `saldoAwal + totalPemasukanSemuaWaktu - totalPengeluaranSemuaWaktu`.
- Ringkasan periode menghitung transaksi di dalam periode, bukan memakai saldo akhir sebagai pemasukan.
- Edit/hapus transaksi harus tercermin satu kali, tanpa penghitungan ganda.

#### Kategori
- Kategori default yang masuk akal dalam bahasa Indonesia.
- Kategori pemasukan dan pengeluaran dibedakan.
- Pengguna dapat menambah, mengganti nama, mengarsipkan, dan memilih kategori.
- Kategori yang sudah dipakai oleh transaksi tidak boleh membuat transaksi lama kehilangan makna ketika kategori diarsipkan.

#### Penyimpanan dan backup
- Data finansial disimpan di browser/perangkat melalui database lokal.
- Data bertahan setelah aplikasi ditutup dan dibuka ulang.
- Ekspor backup JSON mencakup seluruh data, versi skema, dan metadata waktu ekspor.
- Impor memvalidasi struktur data dan menampilkan ringkasan sebelum menerapkan perubahan.
- Versi MVP: impor mengganti data lokal setelah konfirmasi eksplisit; jangan merge secara diam-diam.
- Ekspor transaksi CSV boleh disediakan jika tidak mengganggu alur utama.
- Kegagalan penyimpanan harus ditampilkan dengan pesan yang jelas; jangan berpura-pura data tersimpan.

### 5.2 P1: fitur pendukung

- Analitik sederhana: tren pemasukan/pengeluaran dan kategori pengeluaran terbesar.
- Anggaran bulanan per kategori, dengan progres yang jelas dan tidak menghakimi.
- Target tabungan berbasis nominal target dan progres manual.
- Tagihan/iuran berulang yang dicatat sebagai pengingat/entri terencana, bukan pembayaran otomatis.
- Utang/piutang sebagai catatan kewajiban, dipisahkan dari transaksi kas agar tidak menggandakan saldo.

Fitur P1 harus diimplementasikan setelah P0 stabil dan setelah desainnya disetujui. Hindari memasukkan semua modul ke dashboard.

### 5.3 P2: eksplorasi masa depan

- Asisten AI untuk membantu memahami ringkasan dan menyusun draft transaksi berdasarkan teks.
- Impor data dari format lain.
- PWA/offline installation polish.

AI tidak boleh mengirim data ke provider eksternal tanpa pemberitahuan dan persetujuan eksplisit. Implementasi AI eksternal memerlukan keputusan arsitektur dan perlindungan API key; jangan pernah menaruh secret key pada bundle browser. AI tidak boleh membuat, mengubah, atau menghapus transaksi tanpa konfirmasi pengguna.

## 6. Model data konseptual

### Transaction
- `id`: ID unik lokal.
- `type`: `income | expense`.
- `amount`: bilangan bulat positif dalam unit Rupiah.
- `categoryId`: referensi kategori.
- `occurredAt`: tanggal/waktu kejadian yang dipakai pada laporan.
- `note`: string opsional, dibatasi panjang yang wajar.
- `createdAt`, `updatedAt`: timestamp.

### Category
- `id`, `name`, `type`, `color`/token, `iconKey` opsional, `isDefault`, `archivedAt` opsional.

### AppSettings
- `openingBalance`: bilangan bulat Rupiah, boleh nol.
- `currency`: `IDR` untuk MVP.
- `onboardingCompleted` dan preferensi UI seperlunya.

### Entitas P1
Budget, SavingsGoal, RecurringItem, DebtRecord dapat ditambahkan pada milestone yang terpisah setelah schema dan UI P0 stabil. Hindari membuat tabel/entitas yang belum dibutuhkan.

## 7. Aturan bisnis keuangan

1. Semua nilai uang disimpan sebagai integer Rupiah; jangan gunakan floating point sebagai sumber kebenaran nominal.
2. Nominal transaksi positif; jenis transaksi menentukan apakah ditambahkan atau dikurangkan.
3. Saldo awal bukan pemasukan pada bulan berjalan. Ia merupakan baseline sebelum semua transaksi yang dicatat.
4. Transaksi yang diedit menggantikan nilai lama, tidak membuat transaksi baru.
5. Transaksi yang dihapus tidak boleh memengaruhi ringkasan setelah penghapusan selesai.
6. Filter periode memakai tanggal lokal yang jelas dan mencakup seluruh hari awal serta akhir periode yang dipilih.
7. Gunakan satu fungsi domain teruji untuk perhitungan ringkasan; jangan menduplikasi rumus di komponen UI.
8. Format Rupiah dilakukan di presentation layer menggunakan formatter standar; data tersimpan tidak berisi string format seperti `Rp 1.000`.
9. Tidak ada transfer antar-rekening pada MVP.
10. Jika data lokal tidak tersedia atau gagal dibaca, jelaskan keadaan tersebut tanpa mengarang saldo.

## 8. Navigasi

Destinasi utama yang disarankan:
- Ringkasan
- Transaksi
- Analitik (setelah tersedia)
- Perencanaan (setelah modul P1 tersedia)

Pengaturan dapat ditempatkan dalam menu sekunder. Jangan menampilkan menu ke fitur yang belum aktif. Tombol tambah transaksi perlu mudah dijangkau di desktop maupun mobile.

## 9. Non-functional requirements

- Local-first: fitur inti tidak memerlukan jaringan.
- Responsive: layout diuji pada lebar sekitar 360 px, 390 px, 768 px, 1024 px, dan 1440 px.
- Aksesibilitas: navigasi keyboard, fokus terlihat, label form, kontras memadai, reduced motion dihormati.
- Ketahanan data: pengujian persistensi, backup, restore, dan operasi transaksi.
- Performa: minimalkan dependency; lazy-load halaman/fitur noninti; chart tidak boleh menahan interaksi awal.
- Keandalan: empty/loading/error states jelas; data penting tidak hilang karena state UI sementara.
- Bahasa: gunakan bahasa Indonesia natural, konsisten, tanpa jargon finansial yang tidak perlu.

## 10. Acceptance criteria MVP

- Pengguna baru dapat melewati onboarding ringan, mengatur saldo awal, lalu masuk dashboard.
- Pengguna bisa menambah pemasukan dan pengeluaran valid.
- Saldo dan ringkasan periode benar setelah tambah, edit, dan hapus transaksi.
- Reload/menutup lalu membuka aplikasi tidak menghapus data lokal.
- Pencarian/filter transaksi menghasilkan daftar yang sesuai.
- Backup dapat diekspor dan diimpor melalui alur konfirmasi yang aman.
- Semua fitur inti berjalan tanpa login dan tanpa jaringan.
- Tampilan nyaman pada desktop dan mobile tanpa overflow horizontal.
- Dashboard mengikuti `DESIGN_BRIEF.md`, tidak memakai kartu untuk setiap elemen.
- Tes domain keuangan dan alur utama lulus.

## 11. Risiko dan hal yang belum termasuk

- Data browser dapat hilang jika pengguna menghapus data situs/browser atau menggunakan profil/perangkat berbeda. Edukasi backup harus jelas.
- IndexedDB browser tidak otomatis terenkripsi. Jangan mengklaim data terenkripsi atau aman dari pengguna lain pada perangkat yang sama.
- Backup JSON adalah data sensitif; pengguna harus menyimpannya secara sadar.
- AI eksternal, sinkronisasi antarperangkat, proteksi aplikasi dengan PIN, dan enkripsi backup memerlukan keputusan terpisah.
