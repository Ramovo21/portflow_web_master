# PortFlow Web

Giao diện web (SPA) của hệ thống **PortFlow** — quản lý khách hàng, hợp đồng & phụ lục, danh mục dịch vụ/bảng giá, quy trình duyệt hồ sơ (workflow) và phân quyền. Frontend chỉ là lớp trình bày: toàn bộ nghiệp vụ, workflow và phân quyền nằm ở backend (repo `portflow`); đăng nhập dùng Keycloak (OIDC).

## Mục lục

- [Công nghệ](#công-nghệ)
- [Chạy nhanh](#chạy-nhanh)
- [Biến môi trường](#biến-môi-trường)
- [Các lệnh npm](#các-lệnh-npm)
- [Kiến trúc](#kiến-trúc)
- [Quy ước khi phát triển](#quy-ước-khi-phát-triển)
- [Tài liệu thiết kế](#tài-liệu-thiết-kế)

---

## Công nghệ

| Nhóm           | Thư viện / công cụ                                                 |
| -------------- | ------------------------------------------------------------------ |
| UI             | React 19, Ant Design 6 (locale `vi_VN`), `@ant-design/icons`       |
| Build / dev    | Vite 8, TypeScript 6 (`strict` qua `tsconfig.app.json`)            |
| Routing        | React Router 7 (`createBrowserRouter`, lazy-load theo feature)     |
| Dữ liệu server | TanStack React Query 5, Axios                                      |
| Form & kiểm tra | React Hook Form + Zod 4 (`@hookform/resolvers`)                   |
| Xác thực       | `oidc-client-ts` + `react-oidc-context` (Authorization Code + PKCE) |
| Ngày tháng     | Day.js (locale `vi`)                                               |
| Test           | Vitest 4, Testing Library, jsdom                                   |
| Chất lượng code | ESLint 10 (flat config), Prettier 3                               |

---

## Chạy nhanh

### Yêu cầu

- **Node.js** đủ mới cho Vite 8 (khuyến nghị Node 20.19+ hoặc 22.12+). Kiểm tra: `node -v`.
- **npm** (repo có `package-lock.json`, nên dùng `npm`).
- Backend `portflow` đang chạy (mặc định ở `http://localhost:8080`) và Keycloak realm `portflow` (mặc định ở `http://localhost:8180`), nếu muốn đăng nhập thật.

### Các bước

```bash
# 1. Cài dependency
npm install

# 2. Tạo file cấu hình môi trường cục bộ
cp .env.example .env.local      # chỉnh giá trị nếu môi trường khác mặc định

# 3. Chạy dev server
npm run dev
```

Mở trình duyệt tại **http://localhost:5173**.

Dev server (Vite) tự proxy mọi request `/api/*` sang `API_PROXY_TARGET` (mặc định `http://localhost:8080`), nên trình duyệt gọi cùng origin và không gặp lỗi CORS.

### Thử luồng duyệt (F03) với backend .NET

Backend `portflow-api` chạy bằng `docker compose` bật sẵn **chế độ demo workflow**: Inbox có nút **“Tạo hồ sơ demo”**
để trình một hồ sơ loại `DEMO` vào quy trình duyệt (chưa có module hồ sơ thật nào được port). Thử nhanh:

1. Đăng nhập `sales01` → **Tạo hồ sơ demo** (giá trị > 500 triệu để đi qua bước Pháp chế).
2. Đăng nhập `salesmgr` → tab **Chờ tôi duyệt** → mở hồ sơ → Duyệt / Từ chối / Yêu cầu sửa.
3. Tiếp tục với `legal01`, rồi `director` hoặc `director2` (mật khẩu seed: `Portflow@123`).

Khi backend tắt demo (`/api/v1/dev/workflow-demo` trả 404) thì nút tự ẩn.

### Chạy bản production

```bash
npm run build      # tsc -b (kiểm tra kiểu) + vite build -> thư mục dist/
npm run preview    # phục vụ dist/ để thử bản build (mặc định http://localhost:4173)
```

Thư mục `dist/` là static site thuần, có thể đặt sau Nginx/CDN. Khi triển khai thật, cần:

- Cấu hình **fallback về `index.html`** cho mọi route (SPA), ví dụ Nginx `try_files $uri /index.html;`.
- Reverse proxy `/api` về backend (hoặc đặt `VITE_API_BASE_URL` thành URL đầy đủ và bật CORS ở backend).
- Đặt `VITE_OIDC_AUTHORITY` và `VITE_OIDC_CLIENT_ID` đúng với Keycloak của môi trường đó. Các giá trị này được **nhúng lúc build**, nên đổi môi trường phải build lại.
- Đăng ký redirect URI `https://<host>/auth/callback`, silent redirect `https://<host>/auth/silent` và post-logout `https://<host>/login` trong client Keycloak.

---

## Biến môi trường

Các biến nằm trong `.env.example`. Copy sang `.env.local` để ghi đè (file `*.local` đã nằm trong `.gitignore`).

| Biến                  | Mặc định                                 | Ý nghĩa                                                                                                  |
| --------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `API_PROXY_TARGET`    | `http://localhost:8080`                  | Địa chỉ backend mà Vite dev server proxy `/api` tới. Chỉ dùng lúc dev, không lộ ra trình duyệt.           |
| `VITE_API_BASE_URL`   | `/api`                                   | Base URL cho mọi API call. Giữ `/api` nếu đi qua proxy/reverse proxy cùng origin.                        |
| `VITE_OIDC_AUTHORITY` | `http://localhost:8180/realms/portflow`  | OIDC issuer của Keycloak realm.                                                                          |
| `VITE_OIDC_CLIENT_ID` | `portflow-web`                           | Public SPA client (Authorization Code + PKCE, không có client secret).                                    |

Biến có tiền tố `VITE_` được đưa vào bundle phía client, **không** đặt bí mật (secret) vào đó.

---

## Các lệnh npm

| Lệnh                 | Tác dụng                                                         |
| -------------------- | ---------------------------------------------------------------- |
| `npm run dev`        | Chạy dev server tại cổng 5173 (strict port), có HMR.             |
| `npm run build`      | Kiểm tra kiểu rồi build production vào `dist/`.                  |
| `npm run preview`    | Xem thử bản build.                                               |
| `npm run typecheck`  | Chỉ kiểm tra kiểu TypeScript (`tsc -b`).                         |
| `npm run lint`       | ESLint toàn project.                                             |
| `npm test`           | Chạy Vitest (chế độ watch khi dev; dùng `npx vitest run` để chạy một lần). |
| `npm run format`     | Format bằng Prettier.                                            |
| `npm run format:check` | Kiểm tra format (dùng trong CI).                               |

---

## Kiến trúc

### 1. Tổng quan

```
┌────────────────────────── Browser ──────────────────────────┐
│  React SPA (portflow-web)                                    │
│  ├─ Router (React Router)      → chọn màn hình theo URL      │
│  ├─ Guards                     → RequireAuth / RequirePermission │
│  ├─ Feature modules            → nghiệp vụ theo domain       │
│  ├─ TanStack Query             → cache & đồng bộ dữ liệu     │
│  └─ Axios `http`               → gắn Bearer token, retry 401 │
└──────┬───────────────────────────────────────────┬───────────┘
       │ /api/* (REST, JSON)                        │ OIDC (redirect / silent)
       ▼                                            ▼
┌──────────────────┐                      ┌──────────────────┐
│ Backend portflow │                      │ Keycloak (realm  │
│ (repo riêng)     │◄── JWT access token ─│ portflow)        │
│                  │                      └──────────────────┘
└──────────────────┘
```

Frontend **không có server riêng**: chỉ là static bundle. Mọi dữ liệu đi qua REST API của backend, và mọi quyết định phân quyền cuối cùng do backend đưa ra (UI chỉ ẩn/hiện theo quyền để trải nghiệm tốt hơn).

### 2. Cấu trúc thư mục

```
portflow-web/
├── index.html                 # Entry HTML, mount #root
├── vite.config.ts             # Alias @ → src, proxy /api, cấu hình Vitest
├── src/
│   ├── main.tsx               # Điểm vào: render <App/>; xử lý callback silent OIDC
│   ├── app/                   # "Vỏ" ứng dụng: providers, router, layout, theme
│   │   ├── App.tsx            # Ghép AppProviders + RouterProvider
│   │   ├── providers.tsx      # AuthProvider, ConfigProvider (antd), QueryClientProvider
│   │   ├── router.tsx         # Khai báo toàn bộ route + guard + lazy-load
│   │   ├── theme.ts           # Theme Ant Design
│   │   └── layout/            # RootLayout, AppLayout (sidebar/header), navigation, chuông thông báo
│   ├── features/              # Một thư mục = một domain nghiệp vụ (xem bảng dưới)
│   │   └── <feature>/
│   │       ├── index.ts       # Barrel: export các page/hàm công khai của feature
│   │       ├── pages/         # Component màn hình (được route tham chiếu)
│   │       ├── components/    # UI con dùng trong feature
│   │       ├── api/           # Hàm gọi REST (dùng `http`)
│   │       ├── hooks/         # Hook React Query (useX, queryKeys)
│   │       ├── lib/           # Logic thuần: validate, format, tính toán (có unit test)
│   │       └── __tests__/ / *.test.tsx   # Test cạnh code hoặc trong thư mục test
│   ├── shared/                # Mã dùng chung, không phụ thuộc feature
│   │   ├── components/        # feedback, layout, page, data, status, document, brand
│   │   ├── hooks/             # useListQuery, useIdempotentMutation, useUnsavedChangesGuard, ...
│   │   ├── lib/               # http (axios), queryClient, problem (xử lý lỗi), format, statusLabels
│   │   ├── styles/global.css
│   │   └── types/api.ts       # Kiểu chung cho response phân trang, ...
│   ├── pages/NotFoundPage.tsx # Trang 404
│   └── test/                  # setup Vitest, render helper, fixtures dùng chung
├── docs/design/               # Tài liệu thiết kế UI (tiếng Việt), 01 → 07
├── public/                    # Tài nguyên tĩnh (favicon, icons.svg)
└── dist/                      # Output build (không commit)
```

### 3. Các feature (domain)

| Feature        | Đường dẫn chính                         | Vai trò                                                              |
| -------------- | --------------------------------------- | -------------------------------------------------------------------- |
| `auth`         | `/login`, `/auth/callback`, `/account`  | Đăng nhập OIDC, session, guard, trang tài khoản, từ chối truy cập.   |
| `inbox`        | `/` (trang chủ)                         | Hộp việc cần duyệt (3 tab), thống kê, SLA.                           |
| `review`       | `/review/:documentType/:documentId`     | Màn hình duyệt hồ sơ, tiến độ và lịch sử duyệt.                      |
| `customers`    | `/customers`, `/customers/:id`          | Danh sách/chi tiết/tạo-sửa khách hàng, tạm ngưng.                    |
| `contracts`    | `/contracts/...`, `/addenda/:id`        | Hợp đồng, phiên bản, điều khoản theo thời điểm, phụ lục.             |
| `catalog`      | `/catalog`                              | Danh mục dịch vụ và nhóm dịch vụ.                                    |
| `pricing`      | `/pricing/...`                          | Bảng giá, version, so sánh, xem trước đơn giá (resolve).             |
| `volume`       | `/volume`                               | Kỳ sản lượng.                                                        |
| `billing`      | `/billing/...`                          | Bảng kê thanh toán (payment sheet).                                  |
| `audit`        | `/audit/:documentType/:documentId`      | Dòng thời gian audit của một hồ sơ.                                  |
| `delegation`   | `/delegations`                          | Ủy quyền duyệt tạm thời.                                             |
| `workflow`     | (component dùng chung)                  | Tiến độ workflow, timeline, modal thao tác duyệt, hook dùng lại.     |
| `admin`        | `/admin/...`                            | Quản trị: người dùng (bản sao Keycloak + đồng bộ), phòng ban, vai trò & quyền, loại hồ sơ, định nghĩa workflow, hàng đợi sự kiện (outbox, `System.Admin`). |
| `esign`, `notifications` | —                                     | Module khung, chưa có nội dung (barrel `index.ts` còn rỗng).          |

Sơ đồ route đầy đủ và quy ước màn hình nằm trong `docs/design/02-nen-tang-nghiep-vu.md`.

### 4. Routing và phân quyền

Toàn bộ route khai báo trong `src/app/router.tsx`, có dạng cây:

```
RootLayout                       ← layout gốc
├── /login, /auth/callback       ← công khai
└── RequireAuth                  ← chưa đăng nhập → chuyển sang /login
    └── AppLayout  (path "/")    ← khung sidebar + header
        ├── index                ← Inbox
        ├── customers/...        ← guarded(["Customer.Read"])
        ├── admin/...            ← guarded(["User.Admin"], ["Role.Admin"], ...)
        └── *  → /404
```

- **`RequireAuth`**: kiểm tra session OIDC. Chưa có session thì thử `signinSilent`, nếu không được thì chuyển tới `/login`.
- **`RequirePermission`** (`guarded([...])`): nhận danh sách quyền, đủ một quyền (`anyOf`) thì hiển thị, không thì hiển thị `ForbiddenPage`.
- **`<Can>`** và **`usePermission()`**: ẩn/hiện nút hoặc menu theo quyền.
- Quyền lấy từ `GET /api/me` (`permissions[]`), đưa vào `SessionContext`. Tên quyền có dạng `Domain.Action`, ví dụ `Contract.Create`, `Workflow.Admin`.

### 5. Code splitting

Mỗi feature được import động:

```ts
const contracts = () => import("@/features/contracts");
...
lazyPage(contracts, "ContractListPage")   // React.lazy + Suspense
```

Nhờ vậy bundle ban đầu chỉ gồm shell, auth và inbox; các feature khác được tải khi người dùng mở đúng màn hình. Vite tự tách chunk theo feature (xem `dist/assets/`).

### 6. Xác thực (OIDC)

- Thư viện: `oidc-client-ts` và `react-oidc-context`, flow **Authorization Code + PKCE**, client Keycloak là public client (không có secret).
- `src/features/auth/oidc.ts` tạo `userManager`. Token **chỉ giữ trong bộ nhớ** (`InMemoryWebStorage`), không lưu localStorage, để giảm rủi ro XSS đánh cắp token.
- Route callback: `/auth/callback` (đăng nhập). `/auth/silent` dùng cho silent renew qua iframe; `main.tsx` xử lý trường hợp này trước khi mount React.
- `automaticSilentRenew` làm mới token ngầm. Nếu renew lỗi, `emitSessionExpired` hiện `SessionExpiredModal`.
- Sau khi đăng nhập, `GET /api/me` lấy thông tin người dùng, phòng ban, vai trò, `dataScope` và danh sách quyền. Tài khoản bị khóa hoặc chưa gán phòng ban (lỗi `AUTH_USER_INACTIVE` / `AUTH_USER_NOT_PROVISIONED`) sẽ được `SessionProvider` hiển thị `AccountBlockedPage`.
- Có `actingFor` để hiển thị khi người dùng đang duyệt thay người khác (ủy quyền).

### 7. Gọi API và quản lý dữ liệu

**Lớp HTTP** (`src/shared/lib/http.ts`):

- Một instance Axios `http` dùng chung, `baseURL` = `VITE_API_BASE_URL`, timeout 10 giây.
- Request interceptor: gắn `Authorization: Bearer <token>`. Có thể bỏ qua bằng `skipAuth: true` (ví dụ `/health`).
- Response interceptor:
  - `401` → thử renew token rồi gửi lại đúng một lần; nếu vẫn lỗi thì báo session hết hạn.
  - `403` với mã `AUTH_USER_INACTIVE` / `AUTH_USER_NOT_PROVISIONED` → báo tài khoản bị chặn.

**Chuẩn lỗi** (`src/shared/lib/problem.ts`): backend trả lỗi dạng RFC 7807 (`ProblemDetail`) kèm `errorCode`, `correlationId` và `errors[]` theo từng field. Frontend map `errorCode` sang thông điệp hiển thị và dùng `ProblemAlert` để báo lỗi. Xung đột khi lưu được xử lý bằng `useConflictModal`.

**Server state** (TanStack Query, `src/shared/lib/queryClient.ts`):

- `staleTime` 30 giây, `retry` 1 lần.
- Mỗi feature có `queryKeys` riêng (ví dụ `contracts/hooks/queryKeys.ts`) để invalidate chính xác.
- Ghi dữ liệu dùng `useIdempotentMutation` (gửi kèm khóa idempotent để tránh tạo trùng khi bấm nhiều lần).
- Danh sách có phân trang/bộ lọc dùng `useListQuery`.
- Form cảnh báo khi rời trang có thay đổi chưa lưu nhờ `useUnsavedChangesGuard`.

**Kiểu dữ liệu**: các DTO nằm trong `api/*.ts` của từng feature. Các kiểu dùng chung như phân trang nằm ở `shared/types/api.ts`.

### 8. Giao diện

- Dùng **Ant Design** làm bộ component chính. `src/app/theme.ts` định nghĩa theme; `ConfigProvider` bật locale `vi_VN`.
- `shared/components/` gom các thành phần nghiệp vụ lặp lại:
  - `page/`: `PageHeader`, `FilterBar`, `PageSpinner`, `PlaceholderPage`
  - `feedback/`: `ProblemAlert`, `EmptyState`, `ReasonModal`, `useConflictModal`
  - `status/`: `StatusTag` (màu theo trạng thái, nhãn lấy từ `statusLabels.ts`)
  - `data/`: `MoneyText`, `DateText`
  - `document/`: `DocumentLayout`, `DocumentHeader`, `DocumentLink`
- Layout responsive: có nhánh riêng cho màn hình nhỏ (ví dụ `MobileActionBar` ở màn duyệt, `InboxCardList` thay cho bảng).

### 9. Luồng dữ liệu điển hình

Ví dụ mở danh sách hợp đồng:

```
ContractListPage
  └─ useContracts(filter)          (hooks/useContracts.ts, queryKey từ queryKeys.ts)
       └─ api/contracts.ts         → http.get("/contracts", { params })
            └─ interceptor gắn Bearer token
                 └─ backend /api/contracts
       ← JSON → React Query cache → render bảng
```

Ví dụ duyệt hồ sơ: `ReviewPage` lấy trạng thái từ `workflow` hooks, người dùng bấm Duyệt → mở `ApprovalActionModal` → gọi API → invalidate query của hồ sơ và inbox.

### 10. Kiểm thử

- Test đơn vị và logic thuần nằm trong `lib/` (ví dụ `sla.test.ts`, `contractLogic.test.ts`, `domain.test.ts`).
- Test màn hình dùng `@testing-library/react`, render qua `src/test/render.tsx` (đã bọc sẵn providers). Mock dữ liệu lấy từ `src/test/fixtures.ts` hoặc `fixtures.ts` của feature.
- `src/test/setup.ts` nạp `jest-dom` và cấu hình môi trường jsdom.

```bash
npx vitest run                 # chạy một lần
npx vitest run src/features/contracts   # chỉ một feature
```

---

## Quy ước khi phát triển

- **Import**: dùng alias `@/` thay cho đường dẫn tương đối dài (`@/shared/lib/http`).
- **Ranh giới feature**: code của feature A chỉ import từ `index.ts` (barrel) của feature B, hoặc từ `shared/`. Không import xuyên sâu vào `components/` của feature khác.
- **Logic nghiệp vụ** đặt trong `lib/` dưới dạng hàm thuần để dễ test, không đặt trong component.
- **Gọi API** chỉ qua `http` trong `api/`, không gọi `fetch`/`axios` trực tiếp trong component.
- **Quyền**: thêm quyền mới trong `guarded([...])` của router và `<Can>` ở UI, đồng thời backend phải kiểm tra lại.
- **Không đưa secret** vào biến `VITE_*` hoặc vào code.
- Trước khi tạo PR, chạy: `npm run typecheck && npm run lint && npx vitest run`.

---

## Tài liệu thiết kế

Thư mục `docs/design/` (tiếng Việt) mô tả thiết kế từng màn hình:

| File                              | Nội dung                                              |
| --------------------------------- | ----------------------------------------------------- |
| `01-dang-nhap.md`                 | Đăng nhập, layout, phân quyền menu                    |
| `02-nen-tang-nghiep-vu.md`        | Quy ước chung, component dùng lại, bảng mã lỗi, route |
| `03-inbox-va-duyet.md`            | Inbox và trang duyệt hồ sơ                            |
| `04-khach-hang.md`                | Khách hàng                                            |
| `05-hop-dong-phu-luc.md`          | Hợp đồng và phụ lục                                   |
| `06-danh-muc-bang-gia.md`         | Danh mục dịch vụ và bảng giá                          |
| `07-quan-tri-workflow.md`         | Quản trị định nghĩa workflow                          |
