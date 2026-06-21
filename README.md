# Ride Together MVP

Mobile-first MVP for riding groups that need realtime team location, trip rooms, lagging/offline alerts, and SOS.

## Stack

- Mobile: React Native + Expo + TypeScript
- Backend: NestJS + TypeScript
- Database: PostgreSQL + PostGIS
- Realtime state: Redis
- Realtime transport: Socket.IO
- Admin: Next.js

## Local run

```bash
npm install
docker compose up --build
```

Backend API:

```text
http://localhost:3000
http://localhost:3000/docs
```

Mobile app:

```bash
cd apps/mobile
npm run start
```

For a physical device, set `apps/mobile/.env` so `EXPO_PUBLIC_API_URL` and
`EXPO_PUBLIC_SOCKET_URL` point to your machine LAN IP instead of `localhost`.

Admin web:

```bash
npm run dev:admin
```

Admin web runs at:

```text
http://localhost:3001
```

## Demo users

After the backend has migrated the database, seed demo data with:

```bash
docker compose exec backend npm run seed
```

Demo credentials:

```text
leader@example.com / password123
rider@example.com / password123
```

If you run the seed command directly from your host machine, use the host
database URL:

```powershell
npm --workspace apps/backend run seed:local
```

The Docker Postgres service is exposed on local port `5433` to avoid clashing
with a local PostgreSQL installation on `5432`.

`seed:local` runs database migrations first, then inserts demo users and demo
safety data.

## Verification

The current project has been checked with:

```bash
npm --workspace apps/backend run typecheck
npm --workspace apps/backend run build
npm --workspace apps/mobile run typecheck
npm --workspace apps/admin-web run typecheck
```

## API and realtime contracts

- REST API docs are generated at `http://localhost:3000/docs`.
- Socket event docs live in `packages/shared-contracts/socket-events.md`.

## Implementation order

1. Backend shell, schema, Docker, Swagger
2. Auth and users
3. Teams and trips
4. Location REST API, Redis last location, Socket.IO trip rooms
5. SOS
6. Lagging/offline detection
7. Camera points nearby with PostGIS
8. React Native map screen and realtime markers

## Deploy backend lên Railway

### 1. Tạo project trên Railway

1. Đăng nhập [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Chọn repo `RideTogether`
3. Railway sẽ đọc `railway.toml` và build bằng `apps/backend/Dockerfile.railway`

**Quan trọng:** Trong service backend → **Settings → Source → Root Directory** đặt là:

```text
apps/backend
```

Nếu để trống hoặc sai path, build sẽ lỗi `COPY apps/backend`.

### 2. Thêm PostgreSQL có PostGIS

**Lưu ý:** Postgres mặc định trên Railway **không có PostGIS**. Nếu chạy script báo `extension "postgis" is not available`, làm một trong hai cách dưới.

#### Cách A — Docker PostGIS trên Railway (khuyên dùng)

1. Xóa hoặc bỏ qua Postgres mặc định (nếu không dùng)
2. **+ New** → **Empty Service** → đặt tên `Postgis`
3. **Settings → Source** → **Deploy from Docker Image** → `postgis/postgis:16-3.5`
4. **Variables** trên service Postgis:
   ```env
   POSTGRES_USER=postgres
   POSTGRES_DB=railway
   POSTGRES_PASSWORD=<mat-khau-manh>
   ```
5. **Settings → Volumes** → mount `/var/lib/postgresql/data`
6. **Settings → Networking** → bật private networking (mặc định có)
7. Trên service **backend**, thêm Variables (thay password/host cho đúng):
   ```env
   DATABASE_URL=postgresql://postgres:<mat-khau>@postgis.railway.internal:5432/railway
   ```
   Host `postgis.railway.internal` = tên service viết thường + `.railway.internal`

#### Cách B — Giữ Postgres Railway + bật PostGIS bằng CLI

Chỉ chạy được nếu DB **hỗ trợ** PostGIS (Postgres mặc định thường **không**):

```powershell
cd RideTogether
railway login
railway link
railway run --service Postgres npm run db:enable-postgis --workspace=apps/backend
```

Tên service đúng trên project của bạn là **`Postgres`** (không phải `PostgreSQL`).

Thành công sẽ thấy: `PostGIS enabled successfully.`

### 3. Thêm Redis

1. **Add Service** → **Database** → **Redis**
2. Backend cần Redis cho cache vị trí, online users, SOS

### 4. Biến môi trường (service Backend)

Trong tab **Variables** của service backend:

| Biến | Giá trị |
|------|---------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `DATABASE_SSL` | `false` (dùng URL nội bộ Railway) hoặc bỏ trống |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `JWT_ACCESS_SECRET` | chuỗi random dài (vd. `openssl rand -hex 32`) |
| `JWT_REFRESH_SECRET` | chuỗi random khác |
| `APP_URL` | URL public của backend (vd. `https://xxx.up.railway.app`) |
| `JWT_ACCESS_TTL` | `15m` |
| `JWT_REFRESH_TTL` | `30d` |
| `LOCATION_UPDATE_TTL_SECONDS` | `120` |
| `LOCATION_RATE_LIMIT_TTL_SECONDS` | `3` |
| `DEFAULT_LAGGING_THRESHOLD_M` | `2000` |

`PORT` do Railway tự inject — không cần set.

Migration chạy tự động khi backend khởi động (`migrationsRun: true`).

### 5. Seed demo (tùy chọn)

Chạy từ máy local (cần [Railway CLI](https://docs.railway.app/develop/cli) và repo đã `npm install`):

```bash
railway link
railway variables --service Postgres   # lấy DATABASE_PUBLIC_URL
DATABASE_URL="<DATABASE_PUBLIC_URL>" npm --workspace apps/backend run seed
```

### 6. Kiểm tra

- Health: `https://<your-domain>/health` → `{"status":"ok"}`
- Swagger: `https://<your-domain>/docs`
- Mobile app: set `EXPO_PUBLIC_API_URL` và `EXPO_PUBLIC_SOCKET_URL` trỏ tới URL Railway

### 7. Generate domain

Trong service backend → **Settings** → **Networking** → **Generate Domain**

Socket.IO hoạt động trên cùng domain/port — không cần service riêng.
