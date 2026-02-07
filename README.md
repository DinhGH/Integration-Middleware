# Integration Middleware - Multi Database Viewer

Ứng dụng web giúp xem và so sánh dữ liệu từ nhiều cơ sở dữ liệu MySQL trong cùng một giao diện, gồm backend API và frontend dashboard.

## Cấu trúc Dự án

```
Integration-Middleware/
├── README.md
├── client/                         # Frontend React + Vite
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── main.jsx
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── cart/
│   │   │   │   └── CartDrawer.jsx
│   │   │   ├── chat/
│   │   │   │   └── ChatWidget.jsx
│   │   │   ├── layout/
│   │   │   │   └── AppHeader.jsx
│   │   │   ├── modals/
│   │   │   │   ├── CheckoutModal.jsx
│   │   │   │   └── OrdersModal.jsx
│   │   │   └── sections/
│   │   │       ├── DatabaseSelector.jsx
│   │   │       ├── OrdersSection.jsx
│   │   │       └── ProductsSection.jsx
│   │   ├── config/
│   │   │   └── env.js
│   │   └── utils/
│   │       ├── productHelpers.js
│   │       └── tableHelpers.js
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── server/                         # Backend Express.js
  ├── index.js
  ├── package.json
  └── src/
    ├── index.js
    ├── config/
    │   ├── databases.js
    │   └── env.js
    ├── db/
    │   ├── pools.js
    │   └── queries.js
    ├── routes/
    │   ├── aiRoutes.js
    │   ├── analyticsRoutes.js
    │   ├── dbRoutes.js
    │   └── proxyRoutes.js
    └── utils/
      └── http.js
```

## Cơ Sở Dữ Liệu

Ứng dụng kết nối tới 2 cơ sở dữ liệu:

1. **Railway DB**: `mysql://product_reader:StrongPassword123@nozomi.proxy.rlwy.net:42912/railway`
2. **Microservice DB**: `mysql://product_reader:StrongPassword123!@caboose.proxy.rlwy.net:59089/microservice`
3. **PhoneStore DB** (optional): cấu hình qua `PHONESTORE_DATABASE_URL` trong `.env`

## Cài Đặt

### 1. Cài Dependencies cho Server

```bash
cd server
npm install
```

### 2. Cài Dependencies cho Client

```bash
cd client
npm install
```

## Chạy Ứng Dụng

### Cách 1: Chạy riêng rẽ

**Terminal 1 - Backend Server:**

```bash
cd server
npm start
```

Server sẽ chạy trên `http://localhost:5000`

**Terminal 2 - Frontend Development Server:**

```bash
cd client
npm run dev
```

Client sẽ chạy trên `http://localhost:5173`

### Cách 2: Chạy trong VS Code

1. Mở Terminal tích hợp (Ctrl + `)
2. Chạy lệnh `npm start` trong thư mục `server`
3. Mở Terminal khác và chạy `npm run dev` trong thư mục `client`

## API Endpoints

Server cung cấp các endpoints sau:

### Lấy danh sách cơ sở dữ liệu

```
GET /api/databases
```

Response:

```json
{
  "databases": ["railway", "microservice"]
}
```

### Lấy danh sách bảng từ một cơ sở dữ liệu

```
GET /api/:dbName/tables
```

Ví dụ: `GET /api/railway/tables`

Response:

```json
{
  "database": "railway",
  "tables": ["users", "products", "orders", ...]
}
```

### Lấy dữ liệu từ một bảng

```
GET /api/:dbName/:tableName
```

Ví dụ: `GET /api/railway/users`

Response:

```json
{
  "database": "railway",
  "table": "users",
  "columns": [
    {
      "COLUMN_NAME": "id",
      "COLUMN_TYPE": "int(11)",
      "IS_NULLABLE": "NO",
      "COLUMN_KEY": "PRI"
    },
    ...
  ],
  "data": [
    { "id": 1, "name": "John", ... },
    ...
  ],
  "rowCount": 10
}
```

### Health Check

```
GET /api/health
```

## Tính Năng

- ✅ Kết nối đến 3 cơ sở dữ liệu MySQL
- ✅ Hiển thị danh sách tất cả bảng
- ✅ Xem dữ liệu từ bất kỳ bảng nào
- ✅ Hiển thị thông tin cột (tên, kiểu dữ liệu, khóa chính)
- ✅ Giao diện web hiện đại với React
- ✅ Hỗ trợ responsive design
- ✅ Xử lý lỗi kết nối
- ✅ Giới hạn 1000 dòng mỗi truy vấn (tránh quá tải)

## Lưu Ý

- User `product_reader` được cấp quyền READ-ONLY
- Ứng dụng chỉ hiển thị dữ liệu mà user có quyền truy cập
- Dữ liệu tối đa 1000 dòng mỗi truy vấn để tối ưu hiệu suất
- Giá trị NULL được hiển thị với kiểu in nghiêng

## Khắc Phục Sự Cố

### Lỗi kết nối cơ sở dữ liệu

- Kiểm tra kết nối internet
- Xác nhận credentials trong file `.env`
- Kiểm tra cổng (42912 cho railway, 59089 cho microservice)

### CORS Error

- Đảm bảo backend đang chạy trên port 5000
- Kiểm tra lại API_URL trong App.jsx

### Không thấy dữ liệu

- Kiểm tra console browser (F12) để xem lỗi chi tiết
- Kiểm tra server logs

## Công Nghệ Sử Dụng

- **Backend**: Node.js, Express.js, mysql2
- **Frontend**: React 19, Vite
- **Database**: MySQL
- **Styling**: CSS3

## Tác Giả

Group 1 | Group 2 | Group 3 - 2026
