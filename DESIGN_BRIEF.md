# Design Brief: Nota

**Status:** Arah visual utama untuk seluruh halaman  
**Referensi utama:** `references/nota-visual-reference.png`

## 1. Karakter desain

Nota terasa seperti ruang kerja keuangan pribadi yang matang: bersih, tenang, ringan, dengan sentuhan hijau yang segar. Referensi memperlihatkan kanvas terang yang luas, tipografi jelas, bentuk rounded, hero finansial berukuran besar, aksen lime, dan informasi yang disusun dalam beberapa area dengan bobot visual berbeda.

Ambil komposisi dan prinsipnya, bukan detail produk kartu/bank dari gambar. Nota bukan aplikasi bank, jadi jangan menampilkan nomor rekening, mata uang selector, points/rewards, kartu fisik, atau tombol transfer/request balance.

### Kata kunci
- Premium, bukan berlebihan.
- Hangat, bukan steril.
- Dinamis, bukan ramai.
- Minimal, bukan kosong.
- Berkarakter, bukan template dashboard generik.
- Informatif, bukan padat.

## 2. Token visual

### Warna
- `--nota-emerald: #176B52` — warna brand dan tindakan utama.
- `--nota-lime: #A8EB68` — aksen terang untuk satu area penting atau indikator; jangan digunakan pada semua elemen.
- `--nota-soft-green: #DDECE4` — permukaan lembut dan state sukses ringan.
- `--nota-bg: #F7F7F2` — latar aplikasi warm off-white.
- `--nota-surface: #FFFFFF` — area konten penting.
- `--nota-ink: #222824` — teks utama.
- `--nota-muted: #747D76` — teks sekunder.
- `--nota-border: #E6E9E4` — garis halus, hanya bila dibutuhkan.
- `--nota-expense: warna merah yang cukup kontras` — pengeluaran/penurunan; tetapkan setelah uji kontras.

Pastikan warna dipakai konsisten melalui token, bukan literal tersebar di banyak komponen. Periksa kontras teks, terutama teks tipis di atas lime dan soft green.

### Tipografi
- Gunakan satu keluarga sans-serif yang bersih dan mudah dibaca; pilih font system stack terlebih dahulu agar cepat dan tanpa permintaan font eksternal.
- Angka saldo memakai ukuran besar, bobot medium/regular, dan angka tabular agar tidak bergeser saat berubah.
- Judul halaman singkat dan jelas.
- Label sekunder lebih kecil, tetapi tetap terbaca.
- Hindari terlalu banyak font weight dan ukuran yang berbeda.

### Bentuk dan elevasi
- Radius besar untuk hero/area utama, medium untuk kontrol, kecil untuk ikon dan badge.
- Hindari shadow tebal. Gunakan border tipis atau perubahan permukaan untuk pemisahan.
- Hindari membungkus setiap label, angka, dan daftar ke dalam card tersendiri.
- Gunakan ruang kosong sebagai alat hierarki, bukan menumpuk divider.

### Ikon dan motion
- Gunakan ikon Lucide dengan stroke konsisten.
- Ikon tanpa teks hanya untuk kontrol yang benar-benar familier dan memiliki accessible label/tooltip.
- Motion halus dan singkat; tidak boleh menunda tindakan.
- Hormati `prefers-reduced-motion`.

## 3. Komposisi dashboard

### Desktop ≥ 1024 px

1. Workspace berada pada kanvas off-white yang luas, dengan lebar konten terkontrol. Jangan membuat bingkai abu-abu besar hanya untuk meniru screenshot.
2. Header: identitas Nota dan sapaan/heading di kiri; pilihan periode dan tombol tambah transaksi di kanan. Jangan menambahkan avatar palsu, lonceng notifikasi, atau elemen akun yang tidak memiliki fungsi.
3. Area hero 2 kolom yang tidak harus berukuran sama:
   - Area utama: label `Saldo tercatat`, nominal besar, status lokal bila perlu, aksi `Tambah pemasukan` dan `Tambah pengeluaran`.
   - Area aksen lime: ringkasan periode berupa pemasukan, pengeluaran, atau selisih; pilih satu gagasan fokus. Jangan meniru rewards/poin.
4. Area bawah:
   - Satu visual analitik sederhana yang membantu memahami arus kas.
   - Daftar transaksi terakhir yang ringkas dan mudah dipindai.
5. Gunakan sidebar hanya bila terbukti membuat navigasi lebih mudah. Referensi memakai top navigation; pilih top navigation sebagai titik awal pada desktop agar UI tetap ringan.

### Tablet 768–1023 px
- Kurangi jumlah kolom sesuai ruang.
- Pastikan nominal tidak terpotong dan tindakan utama tetap terlihat.
- Grafik dan daftar transaksi boleh tersusun vertikal.

### Mobile 320–767 px
- Prioritaskan saldo, ringkasan periode, dan tambah transaksi.
- Susun konten dalam satu kolom; jangan mengecilkan desktop dashboard menjadi tiga kolom sempit.
- Gunakan navigasi bawah atau navigasi ringkas yang memberi akses mudah ke Ringkasan dan Transaksi.
- Tindakan tambah harus mudah dijangkau, tetapi tidak menutupi konten atau keyboard input.
- Form transaksi memakai halaman/panel yang jelas; field yang sering dipakai harus mudah diisi dengan satu tangan.
- Hindari horizontal overflow. Tabel kompleks harus berubah menjadi daftar baris yang responsif.

## 4. Model informasi

### Hierarki dashboard
1. Saldo virtual saat ini.
2. Pemasukan dan pengeluaran untuk periode aktif.
3. Transaksi terakhir.
4. Grafik/insight satu langkah lebih dalam.
5. Fitur opsional seperti anggaran dan target tabungan tidak mendominasi dashboard.

### Prinsip nominal
- Nominal utama memiliki kontras dan ukuran paling besar.
- Tambahan tanda `+`/`−` dan warna mendukung, bukan menjadi satu-satunya petunjuk.
- Konsisten menggunakan format IDR Indonesia.
- Hindari memotong semua nominal menjadi singkatan bila pengguna perlu memahami jumlah tepatnya; singkatan hanya untuk grafik padat.

### Grafik
- Satu grafik hanya menjawab satu pertanyaan.
- Label dan tooltip harus dapat dipahami; warna saja tidak cukup untuk membedakan data.
- Sediakan fallback ringkas bila belum ada transaksi.
- Jangan menampilkan chart dekoratif dengan data dummy pada penggunaan normal.
- Lazy-load chart jika ukurannya menambah beban awal secara berarti.

## 5. Interaksi

### Pencatatan cepat
- Aksi utama selalu terlihat dari dashboard.
- Jenis transaksi terlihat jelas: Pemasukan atau Pengeluaran.
- Fokus awal diarahkan ke nominal bila sesuai.
- Nominal diformat saat ditampilkan; data tetap integer di domain.
- Kategori default dapat dipilih cepat, tetapi pengguna tetap bisa mengubahnya.
- Catatan bersifat opsional.
- Tanggal default adalah hari ini.
- Tombol simpan memiliki state saving/success/error yang benar.
- Sesudah tersimpan, tampilkan feedback sederhana dan perbarui dashboard.

### State antarmuka
Setiap halaman/fitur harus merencanakan:
- Loading hanya bila operasi async benar-benar membutuhkan tampilan itu.
- Empty state yang menunjukkan langkah selanjutnya.
- Error state dengan pilihan mencoba lagi atau memulihkan data.
- Destructive action dengan konfirmasi.
- Focus state keyboard yang terlihat.

## 6. Bahasa dan microcopy

Gunakan label seperti:
- `Saldo tercatat`
- `Pemasukan`
- `Pengeluaran`
- `Selisih bulan ini`
- `Transaksi terakhir`
- `Tambah pemasukan`
- `Tambah pengeluaran`
- `Belum ada transaksi`
- `Ekspor cadangan`

Hindari label yang mengesankan integrasi bank seperti `rekening terhubung`, `transfer saldo`, atau `saldo bank`. Jangan menggunakan notifikasi reward, akun pengguna, atau kartu jika tidak ada fiturnya.

## 7. Anti-pattern yang dilarang

- Dashboard terdiri dari 8–12 card dengan ukuran dan gaya identik.
- Semua elemen dibatasi garis/border tanpa alasan.
- Shadow tebal, gradient berlebihan, glassmorphism dekoratif.
- Menampilkan data demo seolah-olah data nyata.
- Placeholder/button yang tampak aktif tetapi tidak melakukan tindakan.
- Sidebar dan bottom nav sekaligus pada layar yang sama tanpa kebutuhan jelas.
- Emoji sebagai ikon UI utama.
- Teks abu-abu terlalu pudar dan ukuran label yang terlalu kecil.
- Menggunakan warna hijau pada semua hal sampai hierarchy hilang.
- Mengimplementasikan semua widget referensi secara literal tanpa melihat kebutuhan Nota.
- AI agent menambah library/komponen hanya karena populer tanpa alasan produk.

## 8. Definition of Done visual

Sebuah halaman dianggap selesai jika:
- Hierarki informasi jelas saat dilihat sekilas.
- Layout terasa sebagai bagian dari Nota dan tidak generik.
- Tidak ada elemen akun, bank, wallet, atau pembayaran nyata.
- Layout diuji pada mobile dan desktop.
- Tidak ada overflow, clipped labels, atau modal yang sulit dipakai.
- Keyboard focus, label input, kontras, empty/error state sudah diperiksa.
- Screenshot hasil aktual dibandingkan dengan brief dan referensi.
- Semua kontrol yang terlihat memiliki aksi yang benar.
