# Bengkel Antrian

Sistem antrian servis kendaraan yang dibangun dengan Next.js App Router, TypeScript, Tailwind CSS, Auth.js, Prisma, dan SQLite untuk development.

## Persyaratan

- Node.js 20.9 atau lebih baru
- npm

## Instalasi dan konfigurasi

```powershell
npm install
Copy-Item .env.example .env
```

Ganti `AUTH_SECRET` di `.env` dengan secret acak. Contoh pembuat secret:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`AUTH_TRUST_HOST=true` diperlukan untuk development lokal dan deployment di belakang reverse proxy yang Anda kendalikan; pastikan proxy memvalidasi header host. `DATABASE_URL` bawaan menggunakan SQLite lokal. `SEED_DEMO_PASSWORD` dapat diubah untuk mengganti kata sandi semua akun demo yang dibuat seed.

## Migrasi dan data contoh

```powershell
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
```

Seed hanya boleh dijalankan di development dan akan menyiapkan akun demo, kendaraan, lima jenis servis, pengaturan awal, serta tiket dengan beberapa status.

## Menjalankan aplikasi

```powershell
npm run dev
```

Buka `http://localhost:3000`. Periksa kode dengan `npm run lint` dan buat build produksi dengan `npm run build`.

## Akun demo development

Semua akun demo menggunakan kata sandi `Demo123!` secara bawaan. Nilai ini hanya untuk development; tetapkan `SEED_DEMO_PASSWORD` sebelum menjalankan seed untuk menggantinya.

| Peran | Email |
|---|---|
| Admin | `admin@bengkel.test` |
| Mekanik | `mekanik1@bengkel.test` |
| Mekanik | `mekanik2@bengkel.test` |
| Customer | `pelanggan1@bengkel.test` |
| Customer | `pelanggan2@bengkel.test` |
| Customer | `pelanggan3@bengkel.test` |

## Struktur folder

```text
prisma/                 Schema, migrasi, dan seed database
src/app/                Halaman App Router dan endpoint Auth.js
src/components/         Komponen antarmuka bersama
src/lib/auth/           Pemeriksaan role dan pembatasan percobaan login
src/lib/validation/     Skema validasi Zod
src/lib/                Prisma client dan tipe role
src/auth.ts             Konfigurasi Auth.js dengan Credentials
src/proxy.ts             Pembatasan akses route berdasarkan role
```

## Asumsi

- Role, status, jenis kendaraan, dan sumber tiket disimpan sebagai teks tervalidasi aplikasi karena Prisma SQLite tidak mendukung enum native.
- `partsUsed` dan `holidays` disimpan sebagai JSON ter-serialisasi agar skema tetap bisa dipindahkan ke PostgreSQL.
- Pembatas percobaan login saat ini menggunakan memori proses dan jendela 15 menit; deployment multi-instance memerlukan rate limiter bersama.
- Tanggal antrian memakai kalender `Asia/Jakarta`. Pengambilan untuk hari ini mengikuti jam buka; pemesanan untuk tanggal mendatang dalam rentang 7 hari dapat dilakukan kapan saja.
- Permintaan customer setelah jam tutup (default pukul 17.00) dijadwalkan untuk besok, menahan kuota dan reservasi kendaraan, lalu menunggu persetujuan admin. Nomor urut dicadangkan saat permintaan dibuat; penolakan dapat menyisakan nomor yang tidak terpakai. Setelah disetujui, permintaan menjadi tiket Menunggu; penolakan melepaskan kuota dan reservasi.
- Kuota dihitung dari semua nomor yang telah diterbitkan pada tanggal itu, termasuk tiket yang kemudian dibatalkan atau tidak hadir. Nomor yang sudah terbit tidak digunakan ulang.
- `ActiveVehicleQueue` menjadi batas unik database untuk mencegah satu kendaraan memiliki lebih dari satu tiket aktif pada tanggal yang sama.
- Customer dapat mengelola profil dan kendaraan, mengambil/membatalkan antrian, serta melihat status dan riwayat miliknya.
- Admin mengelola tiket, pengguna customer/mekanik, jenis servis, jam operasional, kuota, hari libur, dan laporan. Penghapusan akun/jenis servis dibatasi bila sudah terkait riwayat; gunakan nonaktif untuk mempertahankan relasi historis.
- Mekanik melihat tugas hari ini yang ditugaskan kepadanya, memulai pekerjaan setelah antrian dipanggil, mencatat servis dan suku cadang, memasukkan biaya jasa/suku cadang, serta melihat riwayat pekerjaannya sendiri.
- Portal customer, panel admin, dan ruang mekanik memiliki identitas, aksen visual, dan navigasi role-specific yang berbeda; akses ke setiap area tetap diperiksa di server.
- Walk-in dibuat admin untuk tanggal hari ini saat bengkel buka, dengan memilih customer dan kendaraan yang sudah terdaftar. Ini menjaga relasi tiket dan riwayat servis tetap konsisten.
- Halaman publik `/display` dan API statusnya hanya menampilkan nomor antrian, layanan, dan mekanik; data pribadi pelanggan tidak ditayangkan. Display memperbarui data setiap 8 detik.
- Laporan harian, mingguan (Senin–Minggu), dan bulanan dapat diekspor sebagai CSV. Endpoint ekspor memerlukan akun admin aktif.
