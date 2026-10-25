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

## Sinkronisasi ke Google Drive dan Docs

Setiap profile yang masuk otomatis dibuatkan satu folder di Google Drive, berisi
Google Doc rapi dari semua jawaban dan salinan file yang di-upload (dipilah per
kategori: Logo, Photos, dst). Fitur ini mati sampai keempat kunci Google di
bawah diisi, jadi aman dipasang lebih dulu.

Untuk testing dipakai Drive pribadi. Nanti untuk Asri, **cukup mengganti 4 kunci
itu dengan milik akun Asri, tanpa mengubah kode**.

### A. Urutan pasang (penting)

1. **SQL dulu.** Di Supabase **SQL Editor**, jalankan isi file
   `supabase/migrations/20261026000100_client_profile_summary.sql`
   (menambah satu kolom). Kalau function dipasang sebelum ini, form akan error.
2. **Function.** Buka **Edge Functions**, klik `client-profile`, tab **Code**.
   Hapus isinya, paste seluruh `supabase/functions/client-profile/index.ts`
   yang baru, lalu **Deploy**. Cek lagi tab **Settings**: toggle JWT harus tetap OFF.
3. **Site.** Commit dan push perubahan terbaru ke production (form sekarang
   mengirim satu data tambahan untuk isi Doc).

### B. Siapkan Google (sekitar 15 menit, semua lewat browser)

Pakai akun Google pribadimu untuk semua langkah ini.

1. Buka `console.cloud.google.com`, klik pemilih project di atas, **New project**,
   beri nama `asri-intake-test`, **Create**.
2. Menu **APIs & Services**, lalu **Library**, cari **Google Drive API**, klik
   **Enable**.
3. Menu **OAuth consent screen** (atau **Google Auth Platform**), lalu **Get started**:
   - App name: `Asri intake`, User support email: emailmu.
   - Audience: **External**.
   - Contact email: emailmu. Setujui, lalu **Create**.
4. Di bagian **Data Access** (atau **Scopes**), klik **Add or remove scopes**,
   cari dan centang `.../auth/drive` ("See, edit, create, and delete all of your
   Google Drive files"), lalu **Update** dan **Save**.
5. Di bagian **Audience**, klik **Publish app** lalu konfirmasi. **Ini penting:**
   kalau dibiarkan mode Testing, kuncinya mati sendiri setelah 7 hari. Google
   akan bilang aplikasinya "belum diverifikasi", dan itu wajar untuk pemakaian
   sendiri.
6. Menu **Credentials**, lalu **Create credentials**, lalu **OAuth client ID**:
   - Application type: **Web application**.
   - Di **Authorized redirect URIs** tambahkan persis:
     `https://developers.google.com/oauthplayground`
   - **Create**. Catat **Client ID** dan **Client secret**.
7. Buka `developers.google.com/oauthplayground`:
   - Klik ikon roda gigi di kanan atas, centang **Use your own OAuth credentials**,
     isi Client ID dan Client secret tadi.
   - Di kolom kiri, kotak "Input your own scopes" ketik
     `https://www.googleapis.com/auth/drive`, klik **Authorize APIs**.
   - Login dengan akun pribadimu. Kalau muncul peringatan "Google hasn't verified
     this app", klik **Advanced**, lalu **Go to ... (unsafe)**, lalu izinkan.
   - Kembali di Playground, klik **Exchange authorization code for tokens**.
   - Salin nilai **Refresh token**.
8. Di Google Drive, buat folder baru, misalnya `Asri client profiles (test)`.
   Buka folder itu. ID folder adalah bagian terakhir alamat di address bar,
   setelah `/folders/`.

### C. Isi kuncinya di Supabase

Di Supabase, **Edge Functions**, lalu **Secrets**, tambahkan empat ini:

| Nama | Isi |
|---|---|
| `GOOGLE_CLIENT_ID` | Client ID dari langkah B6 |
| `GOOGLE_CLIENT_SECRET` | Client secret dari langkah B6 |
| `GOOGLE_REFRESH_TOKEN` | Refresh token dari langkah B7 |
| `GOOGLE_DRIVE_FOLDER_ID` | ID folder dari langkah B8 |

**Ketik atau paste langsung di Supabase. Jangan kirim kunci ini ke siapa pun,
termasuk di chat.** Orang yang punya kunci ini bisa membaca dan mengubah seluruh
Drive-mu.

### D. Coba

Kirim satu profile lewat form. Dalam beberapa detik sampai satu menit, di folder
Drive-mu muncul folder baru bernama `NAMA BISNIS (tanggal)`, berisi Google Doc
dan subfolder file. Di Supabase, baris profile itu `status`-nya jadi `synced`
dan kolom `google_doc_url` terisi. Kalau `sync_failed`, pesan penyebabnya ada di
kolom `sync_error`.

### Yang perlu diketahui

- Profile yang masuk **sebelum** keempat kunci diisi tidak ikut tersinkron
  sendiri. Kirim ulang untuk tes.
- Kalau sinkron gagal (misalnya Google sedang bermasalah), datanya tetap aman di
  Supabase, hanya `status`-nya `sync_failed`. Belum ada tombol untuk mengulang
  otomatis.
- Satu file maksimal 50 MB, dan semua file disalin satu per satu. Profile dengan
  puluhan file besar bisa memakan waktu beberapa menit.

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
- Kolom `status` di tabel `client_profiles` tetap `submitted` kalau sinkronisasi
  Google belum dinyalakan. Setelah dinyalakan, nilainya jadi `synced` atau
  `sync_failed` (lihat bagian Sinkronisasi di atas).
