# URL Shortener & Analytics Engine

Project sederhana untuk **belajar backend** — membangun REST API pemendek URL (URL shortener) lengkap dengan autentikasi, caching, rate limiting, dan pencatatan analitik klik, dipadukan dengan frontend React sebagai dashboard sederhana.

Tujuan utama project ini bukan membuat produk siap produksi, melainkan **latihan hands-on** membangun backend Node.js/Express yang terhubung ke PostgreSQL dan Redis, lengkap dengan autentikasi JWT dan containerization dasar menggunakan Docker.

## Fitur

- **Autentikasi** — register & login dengan JWT
- **Buat short URL** — user yang sudah login bisa membuat, melihat, menonaktifkan, dan menghapus short URL miliknya
- **Redirect** — endpoint publik yang mengarahkan short code ke URL asli
- **Analitik dasar** — setiap klik pada short URL dicatat (IP hash, user agent, referrer, device type) dan bisa dilihat per-URL
- **Caching** — Redis dipakai untuk mempercepat proses redirect
- **Rate limiting** — membatasi request pada endpoint auth & redirect agar tidak mudah di-brute-force
- **Dashboard frontend** — halaman Login, Register, dan Dashboard (list & create short URL) dengan React + Vite + TypeScript + Tailwind

## Tech Stack

**Backend (`apps/api`)**
- Node.js + Express 5 + TypeScript
- PostgreSQL (`pg`) sebagai database utama
- Redis (`ioredis`) untuk caching & rate limiting
- JWT (`jsonwebtoken`) untuk autentikasi, `bcryptjs` untuk hashing password
- `helmet` & `cors` untuk keamanan dasar

**Frontend (`apps/web`)**
- React 19 + Vite + TypeScript
- Tailwind CSS
- React Router untuk routing
- Axios untuk komunikasi ke API

**Infrastruktur**
- Docker Compose untuk menjalankan PostgreSQL & Redis secara lokal
- Struktur monorepo dengan npm workspaces (`apps/api`, `apps/web`)

## Struktur Folder

```
.
├── apps/
│   ├── api/                  # Backend REST API
│   │   └── src/
│   │       ├── config/       # Koneksi DB & Redis
│   │       ├── controllers/  # Logika auth, url, redirect
│   │       ├── db/migrations/ # SQL schema
│   │       ├── middleware/   # Auth guard & rate limiter
│   │       ├── routes/       # Definisi endpoint API
│   │       ├── utils/        # Helper (auth, client info)
│   │       └── app.ts        # Entry point Express
│   └── web/                  # Frontend React
│       └── src/
│           ├── components/   # Protected route wrapper
│           ├── context/      # Auth context
│           ├── lib/          # API client (axios)
│           └── pages/        # Login, Register, Dashboard
├── docker-compose.yml         # PostgreSQL & Redis untuk lokal
└── package.json                # Root workspace
```

## Cara Menjalankan (Lokal)

### 1. Prasyarat
- Node.js (LTS)
- Docker Desktop (untuk PostgreSQL & Redis)

### 2. Install dependencies
Dari root folder:
```bash
npm install
```

### 3. Siapkan environment variables
Buat file `.env` di dalam `apps/api/` (lihat contoh di bawah), berisi konfigurasi database, Redis, dan JWT.

```env
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/urlshortener
REDIS_URL=redis://:password@localhost:6379
JWT_SECRET=ganti-dengan-secret-anda
FRONTEND_URL=http://localhost:5173
```

### 4. Jalankan PostgreSQL & Redis via Docker
```bash
docker compose up -d
```
Lalu jalankan migration SQL (`apps/api/src/db/migrations/001_init.sql`) ke database yang sudah aktif.

### 5. Jalankan backend
```bash
npm run dev:api
```
API akan berjalan di `http://localhost:3000`. Cek endpoint `/health` untuk memastikan koneksi ke database berhasil.

### 6. Jalankan frontend
```bash
npm run dev:web
```
Frontend akan berjalan di `http://localhost:5173` (default Vite).

## Endpoint API

| Method | Endpoint | Keterangan | Auth |
|---|---|---|---|
| POST | `/auth/register` | Registrasi user baru | Tidak |
| POST | `/auth/login` | Login, mengembalikan JWT | Tidak |
| POST | `/urls` | Membuat short URL baru | Ya |
| GET | `/urls` | Melihat daftar short URL milik user | Ya |
| PATCH | `/urls/:id/toggle` | Mengaktifkan/menonaktifkan short URL | Ya |
| DELETE | `/urls/:id` | Menghapus short URL | Ya |
| GET | `/urls/:id/analytics` | Melihat data analitik klik suatu URL | Ya |
| GET | `/:shortCode` | Redirect ke URL asli (endpoint publik) | Tidak |

## Skema Database

- **users** — data akun (email, password hash, role)
- **urls** — short URL yang dibuat, terhubung ke `users`
- **clicks** — log setiap klik pada short URL (IP hash, user agent, referrer, device type), terhubung ke `urls`

## Catatan

Project ini dibuat sebagai media belajar alur backend end-to-end: dari desain skema database, autentikasi, caching, rate limiting, sampai menghubungkannya ke frontend. Beberapa hal yang masih bisa dikembangkan lebih lanjut ke depannya:
- Deployment (Docker image untuk production, CI/CD)
- Monitoring & error tracking
- Backup otomatis
- Visualisasi data analitik yang lebih lengkap di dashboard
