# Backend form client profile

Folder ini berisi sisi server untuk halaman `/client-profile/`. Site-nya statis
(tidak punya server sendiri), jadi form mengirim data ke satu Edge Function di
Supabase. Function itu yang menyimpan jawaban ke database dan file ke Storage.

## Cara pasang (tanpa terminal)

Ada 5 langkah. Semuanya klik dan copy-paste di dashboard.

### 1. Buat tabel di database

1. Buka dashboard Supabase, pilih project kamu.
2. Menu kiri: **SQL Editor**, lalu **New query**.
3. Di VS Code, buka file `supabase/migrations/20261026000000_client_profiles.sql`.
   Select all (Cmd+A), copy (Cmd+C).
4. Paste ke kotak query di Supabase, lalu klik **Run**.
5. Kalau muncul tulisan **Success**, berarti tabel dan bucket penyimpanan file sudah jadi.

### 2. Pasang function

1. Menu kiri: **Edge Functions**, lalu **Deploy a new function**, lalu **Via Editor**.
2. Nama function harus persis: `client-profile`
3. Hapus semua kode contoh yang sudah ada di editor.
4. Di VS Code, buka `supabase/functions/client-profile/index.ts`. Select all, copy,
   lalu paste ke editor Supabase.
5. Klik **Deploy**.
6. Setelah jadi, buka pengaturan function itu dan **matikan** pilihan
   **Enforce JWT Verification**. Ini sengaja: browser klien tidak mengirim kunci apa pun.

### 3. Catat alamat function

Alamatnya seperti ini:

```
https://KODE-PROJECT.supabase.co/functions/v1/client-profile
```

`KODE-PROJECT` adalah kode di address bar dashboard Supabase, tepat setelah
tulisan `/project/`. Contoh: kalau address bar-nya
`supabase.com/dashboard/project/abcdefgh`, maka kodenya `abcdefgh`.

### 4. Beri tahu site alamat itu (Vercel)

1. Buka project di dashboard Vercel, lalu **Settings**, lalu **Environment Variables**.
2. Isi:
   - **Name:** `NEXT_PUBLIC_CLIENT_PROFILE_API`
   - **Value:** alamat dari langkah 3
   - **Environment:** centang **Production** (dan **Preview** kalau mau tes di preview)
3. Klik **Save**.
4. Buka **Deployments**, klik titik tiga (...) di deployment paling atas, lalu **Redeploy**.

Redeploy wajib. Nilai ini dibaca saat site di-build, jadi tanpa redeploy form
tetap tidak bisa mengirim.

Kalau site kamu ada di Netlify: caranya sama, di **Site configuration**, lalu
**Environment variables**, lalu **Deploys**, lalu **Trigger deploy**.

### 5. Coba

1. Buka `/client-profile/` di site, isi seadanya, upload satu file, lalu klik **Send profile**.
2. Cek hasilnya di Supabase:
   - Jawaban: **Table Editor**, tabel `client_profiles`.
   - File: **Storage**, bucket `client-brand-assets`.

Kalau form menampilkan "This form is not connected yet", artinya langkah 4 belum
selesai atau belum di-redeploy.

## Cara pasang (pakai terminal)

Untuk yang terbiasa dengan terminal. Hasilnya sama dengan langkah 1 dan 2 di atas.

```bash
supabase link --project-ref KODE-PROJECT
supabase db push
supabase functions deploy client-profile --no-verify-jwt
```

`--no-verify-jwt` wajib, alasannya sama dengan langkah 2 nomor 6.

## Pengaturan tambahan (boleh dilewati)

Bisa diisi di **Edge Functions**, lalu **Secrets**, atau lewat
`supabase secrets set NAMA=nilai`.

| Nama                   | Gunanya                                                                                                                                                                                                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ALLOWED_ORIGINS`      | Daftar alamat site yang boleh memakai function ini, dipisah koma. Kalau kosong, yang boleh: findyourasri.com, www.findyourasri.com, findyourasri.netlify.app, dan localhost:3000. **Kalau site kamu di domain lain (misalnya alamat `.vercel.app`), isi ini**, kalau tidak form akan ditolak. |
| `TURNSTILE_SECRET_KEY` | Menyalakan cek anti-bot Cloudflare Turnstile. Isi juga `NEXT_PUBLIC_TURNSTILE_SITE_KEY` di Vercel.                                                                                                                                                                                            |
| `NOTIFY_WEBHOOK_URL`   | Alamat webhook Slack. Kalau diisi, tim dapat pesan setiap ada profile baru masuk.                                                                                                                                                                                                             |

## Hal yang perlu diketahui

- **Batas ukuran file 50 MB** per file di paket Supabase Free. Kalau pakai paket
  Pro dan mau batas lebih besar, ubah `file_size_limit` di file SQL,
  `MAX_FILE_BYTES` di `index.ts`, dan `KIT_MAX_BYTES` di
  `lib/client-profile/schema.ts`.
- **File yang di-upload tapi form-nya tidak jadi dikirim** tetap tersimpan di
  bucket. Bersihkan sesekali lewat dashboard **Storage** (folder yang namanya
  tidak ada di `client_profiles`).
- Kolom `status` di tabel `client_profiles` akan tetap `submitted` sampai
  sinkronisasi ke Google Docs dan Drive dibuat. Setelah itu berubah jadi
  `synced` atau `sync_failed`.
