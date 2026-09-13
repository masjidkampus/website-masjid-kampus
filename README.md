# Website Masjid Kampus UMS — V2

## Stack
- HTML
- CSS
- JavaScript (ES6+)
- Supabase PostgreSQL
- Vercel

JavaScript/Node.js adalah pilihan yang didukung Vercel. Project ini memakai static HTML/CSS/JS dan Supabase untuk database.

## Struktur
```text
/
├── index.html
├── layanan.html
├── layanan-detail.html
├── kegiatan.html
├── style.css
├── app.js
├── service-page.js
├── events-page.js
├── config.js
├── vercel.json
└── supabase/
    └── schema.sql
```

## Setup Supabase
1. Buat project baru di Supabase.
2. Buka SQL Editor.
3. Jalankan semua isi `supabase/schema.sql`.
4. Ambil Project URL + Publishable Key dari halaman Connect.
5. Masukkan ke `config.js`.

**Jangan gunakan service_role / Secret Key di frontend.**

## Layanan
Halaman layanan:
- Peminjaman Masjid
- Peminjaman Alat
- Media Partner
- Barang Hilang & Temuan
- Kritik & Saran

Halaman detail menggunakan URL:
- `layanan-detail.html?service=peminjaman-masjid`
- `layanan-detail.html?service=peminjaman-alat`
- `layanan-detail.html?service=media-partner`
- `layanan-detail.html?service=barang-temuan`
- `layanan-detail.html?service=kritik-saran`

Pengajuan disimpan ke tabel `service_requests` dengan JSONB pada kolom `form_data`, sehingga field tiap layanan bisa berbeda.

## Deploy Vercel
1. Push semua folder ke GitHub.
2. Di Vercel pilih Add New Project → Import repository.
3. Framework Preset: Other.
4. Build Command: kosong.
5. Output Directory: `.`
6. Deploy.

## Catatan keamanan
RLS sudah diaktifkan dan frontend hanya diberi izin INSERT pada pengajuan/kontak dan SELECT pada data publik.
Untuk tahap produksi, sebaiknya dibuat dashboard admin dengan Supabase Auth dan policy yang hanya mengizinkan akun admin membaca/mengubah pengajuan.


# Dashboard Admin

Buka:

`/admin.html`

Dashboard menggunakan Supabase Auth email/password. Login tidak memakai username/password yang ditulis di JavaScript.

## Membuat akun admin

1. Supabase Dashboard → Authentication → Users.
2. Pilih Add user / Create user.
3. Buat email + password admin.
4. Setelah user dibuat, salin **User UID**.
5. Di SQL Editor jalankan:

```sql
insert into public.admin_users (user_id, role)
values ('GANTI-DENGAN-UUID-USER', 'admin');
```

6. Buka `admin.html`, lalu login memakai email/password tersebut.

Akses dashboard dan operasi CRUD akan ditolak oleh RLS bila akun bukan admin.

## Yang bisa dilakukan admin

- melihat seluruh pengajuan layanan;
- melihat detail data form;
- mengubah status: Baru / Diproses / Disetujui / Ditolak / Selesai;
- menghapus pengajuan;
- melihat dan menghapus pesan kontak;
- tambah/edit/hapus kegiatan;
- tambah/edit/hapus rekening donasi.

## Alur database yang direkomendasikan

Pengunjung website:
`anon + publishable key` → hanya INSERT pengajuan/kontak dan SELECT data publik.

Admin:
`authenticated + akun di admin_users` → RLS mengizinkan SELECT/INSERT/UPDATE/DELETE yang diperlukan.

Jangan pernah memasukkan `service_role` / Secret Key ke browser, GitHub, atau `config.js`.


## Service detail form update
The five service detail flows now share a consistent form layout inspired by the provided reference:
- Peminjaman Masjid — Ajukan + Konfirmasi
- Peminjaman Alat — Ajukan + Konfirmasi
- Media Partner — Ajukan
- Barang Hilang & Temuan — Ajukan Pengambilan
- Kritik & Saran — Kirim Masukan

Desktop uses a two-column form and mobile switches to a single column. Form submissions continue to write into `service_requests.form_data` as JSONB.
