# Nota Blueprint

Paket spesifikasi awal untuk membangun **Nota**, aplikasi pengelolaan keuangan pribadi yang local-first, tanpa login, tanpa rekening/wallet asli, dan berfokus pada pengalaman yang premium, tenang, serta cepat.

## Isi paket

- `PRD.md`: kebutuhan produk, target pengguna, ruang lingkup, aturan bisnis, dan kriteria penerimaan.
- `DESIGN_BRIEF.md`: arahan visual berdasarkan referensi yang diberikan, sistem desain, layout, dan anti-pattern.
- `ARCHITECTURE.md`: framework, penyimpanan lokal, struktur kode, keamanan data, performa, dan pengujian.
- `AGENTS.md`: instruksi persisten untuk coding agent agar tetap konsisten dan tidak mengarang fitur.
- `HANDOFF.md`: status awal dan format serah-terima antar sesi/agent.
- `IMPLEMENTATION_PLAN.md`: milestone berurutan dengan acceptance gate.
- `references/nota-visual-reference.png`: gambar referensi asli untuk diberikan kepada agent visual-capable.

## Keputusan utama yang sudah dikunci

1. Nama produk adalah **Nota**.
2. Produk merupakan aplikasi personal single-user. Tidak ada login, profil pengguna, akun bank asli, kartu, integrasi e-wallet, atau transfer antar-rekening.
3. Fungsi inti tidak membutuhkan server atau cloud database. Data keuangan disimpan di perangkat/browser.
4. Ringkasan saldo, pemasukan, pengeluaran, dan pencatatan transaksi adalah prioritas utama.
5. Anggaran, target tabungan, utang/piutang, iuran/tagihan, analitik lanjutan, dan AI bersifat opsional serta bertahap.
6. Referensi visual menjadi arah komposisi dan nuansa, bukan template untuk disalin mentah-mentah.

## Cara memulai pada repository baru

1. Buat repository GitHub baru bernama `nota` (atau nama yang tersedia) dan jadikan repository tersebut sebagai sumber kerja utama.
2. Salin seluruh isi paket ini ke root repository. Jangan salin riwayat Git proyek lama.
3. Berikan semua dokumen dan file referensi ke coding agent.
4. Minta agent membaca `AGENTS.md`, lalu `PRD.md`, `DESIGN_BRIEF.md`, `ARCHITECTURE.md`, dan `IMPLEMENTATION_PLAN.md`.
5. Minta agent memulai **Milestone 0 saja**, kemudian menampilkan keputusan dan hasil pemeriksaan sebelum lanjut.
6. Setelah setiap milestone, wajib jalankan tes yang relevan dan update `HANDOFF.md`.

## Sumber keputusan jika ada konflik

- Product scope dan aturan pengguna: `PRD.md`
- Tampilan dan pengalaman pengguna: `DESIGN_BRIEF.md`
- Pilihan teknologi dan batasan arsitektur: `ARCHITECTURE.md`
- Cara agent bekerja dan batas perubahan: `AGENTS.md`
- Urutan pengerjaan: `IMPLEMENTATION_PLAN.md`
- Status implementasi yang benar-benar sudah dikerjakan: `HANDOFF.md`

Jika ada konflik antar dokumen, agent harus berhenti pada bagian yang terdampak, menjelaskan konflik, lalu meminta keputusan. Jangan diam-diam memilih asumsi besar atau mengubah scope.
