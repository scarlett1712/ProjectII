# 🌟 STAR AI - Trợ Lý Cá Nhân Đa Năng Thông Minh

> **Nền tảng trợ lý cá nhân thông minh tích hợp Trí tuệ Nhân tạo (Generative AI)**, kết nối và đồng bộ hai lĩnh vực thiết yếu: **Quản lý Sức khỏe Cá nhân** (Dinh dưỡng, Calo, Nước uống) và **Quản lý Tài chính Cá nhân** (Thu chi, Ngân sách, Nguồn tiền), kết hợp với **Lịch trình & Deadline dạng Sticky Notes tương tác cao**.

---

## 📌 Điểm Nổi Bật Của Hệ Thống

* **🤖 Chatbot Star AI ("Bé Sao") & Function Calling (Tool Use):**
  * Tương tác tự nhiên bằng ngôn ngữ đời thường (ví dụ: *"Vừa ăn bát bún bò 500 calo"*, *"Chi 35k tiền trà sữa từ ví Momo"*).
  * AI tự động phân tích ý định và gọi công cụ (Function Calling loop) để cập nhật thẳng vào cơ sở dữ liệu mà không cần nhập liệu thủ công.
  * Linh vật "Bé Sao" di động (`DraggableStar`) hiển thị trên toàn ứng dụng, có thể tương tác và kéo thả linh hoạt.

* **🎯 Quản lý Deadline & Nhiệm Vụ (Interactive Sticky Notes):**
  * Hiển thị danh sách công việc ưu tiên theo hạn chót (deadline gần đến nhất xếp trước).
  * Hỗ trợ thanh cuộn ngang mượt mà, cho phép xem trọn vẹn toàn bộ nhiệm vụ.
  * Tính năng xé/kéo task từ lịch và trang chủ thành các tờ **Sticky Note** nổi trên màn hình (`Whiteboard Canvas`).
  * Tự động khóa thao tác kéo thả khi nhiệm vụ đã được đánh dấu hoàn thành.

* **💰 Quản lý Tài chính Cá nhân ("Xèng Xèng"):**
  * Quản lý đa tài khoản nguồn tiền (Tiền mặt, Ngân hàng, Ví điện tử) với số dư thời gian thực.
  * Phân loại giao dịch: Chi tiêu (Expense), Thu nhập (Income), Chuyển khoản nội bộ (Transfer).
  * Thiết lập hạn mức chi tiêu (Ngân sách tháng) cho từng danh mục, so sánh chênh lệch giữa dự tính và thực tế.
  * Chặn gửi trùng lặp (Anti-spam click) an toàn khi lưu giao dịch.

* **🥗 Quản lý Dinh dưỡng & Năng lượng (Nutrition & Calorie):**
  * Tự động tính toán chỉ số năng lượng tiêu chuẩn (BMR / TDEE) theo công thức khoa học Mifflin-St Jeor.
  * Ghi chép bữa ăn theo khung giờ (Sáng, Trưa, Tối, Vặt), tự động phân tích và ước lượng khẩu phần calo bằng AI.

* **💧 Theo dõi Nước uống (Water Tracking):**
  * Tự động tính toán lượng nước tiêu thụ khuyến nghị theo cân nặng (`Cân nặng x 35ml`).
  * Chia đều các mốc giờ uống nước trong ngày và ghi nhận nhanh qua 1 chạm.

* **📅 Lịch biểu & Sự kiện (Calendar):**
  * Xem lịch trình theo Ngày (Day), Tuần (Week), Tháng (Month).
  * Hỗ trợ sự kiện và công việc lặp lại định kỳ (Hằng ngày, Hằng tuần, Hằng tháng).

---

## 🛠 Công Nghệ Sử Dụng (Tech Stack)

| Thành phần | Công nghệ |
| :--- | :--- |
| **Frontend** | React 19, Next.js (App Router), TypeScript |
| **Styling & UI** | Tailwind CSS v4, Framer Motion (Animations), Lucide React |
| **Data Viz** | Recharts (Biểu đồ tài chính & năng lượng) |
| **Backend** | Next.js Serverless Route Handlers (`src/app/api/*`) |
| **Database & ORM** | PostgreSQL, Prisma ORM (v7.8.0) |
| **Authentication** | NextAuth.js (Credentials Provider, `bcryptjs` password hashing) |
| **AI Gateway** | OpenClaw Gateway / Gemini API (OpenAI-compatible format) |

---

## 🚀 Hướng Dẫn Cài Đặt Và Chạy Local

### 1. Yêu cầu tiên quyết
* Node.js version 18.x trở lên (khuyến nghị Node 20+).
* Một cơ sở dữ liệu PostgreSQL (local hoặc trên cloud: Neon, Supabase, Railway, v.v.).

### 2. Cài đặt mã nguồn và thư viện
```bash
# Clone repository
git clone <repository-url>
cd projectii-app

# Cài đặt các gói phụ thuộc
npm install
```

### 3. Cấu hình biến môi trường (`.env`)
Tạo tệp `.env` tại thư mục gốc dự án dựa trên `.env.example`:
```bash
cp .env.example .env
```
Cấu hình các tham số cần thiết trong `.env`:
```env
# Chuỗi kết nối PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/health_app?schema=public"

# Khóa bí mật cho NextAuth (có thể sinh bằng lệnh: openssl rand -base64 32)
NEXTAUTH_SECRET="your-strong-random-secret"
NEXTAUTH_URL="http://localhost:3000"

# Cấu hình AI Gateway / LLM (Tùy chọn)
OPENCLAW_GATEWAY_URL="http://127.0.0.1:18789"
OPENCLAW_TOKEN="your-openclaw-token"
# Hoặc truyền trực tiếp khóa Gemini:
# GEMINI_API_KEY="your-gemini-api-key"
```

### 4. Khởi tạo Cơ sở dữ liệu với Prisma
```bash
# Tạo migration và đồng bộ schema vào PostgreSQL
npm run prisma:migrate

# Sinh Prisma Client
npm run prisma:generate

# (Tùy chọn) Nạp dữ liệu mẫu
npm run prisma:seed
```

### 5. Khởi động ứng dụng
```bash
# Chạy ở môi trường phát triển (Development)
npm run dev
```
Mở trình duyệt và truy cập: `http://localhost:3000`

---

## 📁 Cấu Trúc Thư Mục Chính

```
projectii-app/
├── prisma/
│   ├── schema.prisma        # Định nghĩa mô hình dữ liệu (User, Meals, Budget, Tasks,...)
│   └── seed.js              # Kịch bản khởi tạo dữ liệu mẫu
├── src/
│   ├── app/
│   │   ├── (app)/           # Các trang nghiệp vụ chính (yêu cầu đăng nhập)
│   │   │   ├── dashboard/   # Trang tổng quan & Deadline Sticky Notes
│   │   │   ├── budget/      # Phân hệ Quản lý tài chính cá nhân
│   │   │   ├── nutrition/   # Phân hệ Dinh dưỡng & Nước uống
│   │   │   ├── calendar/    # Lịch biểu & quản lý thời gian
│   │   │   ├── tasks/       # Danh sách việc cần làm
│   │   │   └── chat/        # Giao diện trò chuyện chuyên sâu với Star AI
│   │   ├── (auth)/          # Trang xác thực (Đăng nhập / Đăng ký)
│   │   └── api/             # Next.js API Routes xử lý backend
│   │       ├── auth/        # API NextAuth & đăng ký
│   │       ├── budget/      # API giao dịch, tài khoản, danh mục
│   │       ├── chat/        # API AI Chatbot & Function Calling Loop
│   │       ├── meals/       # API nhật ký bữa ăn & gợi ý dinh dưỡng
│   │       ├── tasks/       # API quản lý công việc
│   │       └── water/       # API mục tiêu & nhật ký nước
│   ├── components/          # Reusable React components & Modals
│   │   ├── budget/          # TransactionModal, Account/Category Modals
│   │   ├── nutrition/       # MealManagementTab, WaterReminderTab
│   │   └── DraggableStar.tsx# Linh vật Star AI kéo thả
│   └── lib/                 # Helper utilities (db.ts, auth.ts, calorie.ts,...)
├── .gitignore               # Cấu hình bỏ qua tệp nhạy cảm (.env, build files,...)
└── README.md
```

---

## 🔒 Ghi Chú Bảo Mật (Security Notes)

* Toàn bộ tệp chứa khóa bí mật (`.env`, `.env.local`, `.env.*`) đã được thêm vào `.gitignore` và **tuyệt đối không bao giờ được commit lên repository**.
* Mật khẩu người dùng được băm an toàn một chiều bằng `bcryptjs` trước khi lưu trữ vào cơ sở dữ liệu.
* Toàn bộ các API nghiệp vụ đều được kiểm soát phiên làm việc thông qua session của NextAuth (`requireUserId`).
* Các form nhập liệu đều được trang bị cờ trạng thái xử lý (`isSubmitting`) và disable nút bấm nhằm ngăn chặn tấn công spam click hoặc ghi đúp dữ liệu.
