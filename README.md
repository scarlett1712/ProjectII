# 🌟 STAR AI - Trợ Lý Cá Nhân Thông Minh

Chào mừng bạn đến với **Star AI** – nền tảng trợ lý cá nhân đa năng, người bạn đồng hành dễ thương giúp bạn chăm sóc sức khỏe và quản lý tài chính mỗi ngày một cách nhẹ nhàng, khoa học và thú vị.

---

## ✨ Các Tính Năng Chính

* **🧸 Trợ lý ảo Bé Sao (Star AI):**
  * Trò chuyện thân thiện, ngọt ngào và thấu hiểu.
  * Tự động nhận diện câu nói tự nhiên để ghi chép chi tiêu, bữa ăn, nước uống hoặc tạo lịch hẹn ngay tức thì.
  * Linh vật Bé Sao có thể kéo thả di động và tương tác vui vẻ trên toàn giao diện.

* **🎯 Quản lý Công việc & Deadline (Sticky Notes):**
  * Bảng điều khiển trung tâm với các tờ ghi chú dạng giấy Note sinh động, trực quan.
  * Sắp xếp thông minh theo hạn chót gần nhất và hỗ trợ thanh trượt ngang tiện lợi.
  * Cho phép kéo các đầu việc ra màn hình thành tờ note nổi để không bỏ lỡ việc quan trọng.

* **🥗 Sức Khỏe & Dinh Dưỡng:**
  * Tự động tính toán lượng calo cần nạp mỗi ngày (BMR / TDEE) theo thể trạng cá nhân.
  * Ghi chép nhật ký bữa ăn trong ngày và hỗ trợ ước lượng khẩu phần dinh dưỡng.
  * Theo dõi lượng nước uống hàng ngày với các khung giờ nhắc nhở định kỳ.

* **💰 Quản lý Tài Chính ("Xèng Xèng"):**
  * Quản lý số dư nhiều tài khoản: Tiền mặt, Ví điện tử, Ngân hàng.
  * Ghi chép nhanh các khoản Thu – Chi – Chuyển khoản với danh mục phân loại rõ ràng.
  * Thiết lập và theo dõi hạn mức ngân sách tháng để kiểm soát chi tiêu hiệu quả.

* **📅 Lịch Trình Cá Nhân:**
  * Lịch biểu tương tác theo Ngày, Tuần, Tháng.
  * Quản lý các sự kiện, lịch hẹn và các hoạt động lặp lại định kỳ.

---

## 🛠 Công Nghệ Sử Dụng

* **Nền tảng:** Next.js (App Router), React, TypeScript
* **Giao diện & Chuyển động:** Tailwind CSS, Framer Motion, Lucide Icons, Recharts
* **Cơ sở dữ liệu:** PostgreSQL, Prisma ORM
* **Xác thực:** NextAuth.js

---

## 🚀 Khởi Chạy Nhanh (Local Development)

1. Cài đặt dependencies:
   ```bash
   npm install
   ```

2. Tạo file `.env` dựa theo `.env.example` và điền cấu hình database của bạn.

3. Đồng bộ cơ sở dữ liệu:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

4. Chạy ứng dụng:
   ```bash
   npm run dev
   ```
   Mở trình duyệt tại `http://localhost:3000` để trải nghiệm cùng Bé Sao! 🌟
