# HƯỚNG DẪN CHI TIẾT KIẾN TRÚC VÀ CƠ CHẾ HOẠT ĐỘNG CỦA HỆ THỐNG STAR AI

---

## 1. Kiến Trúc Tổng Quan Hệ Thống

Hệ thống Star AI được phát triển dựa trên kiến trúc **Monolithic Fullstack** sử dụng Next.js làm nền tảng chính, chia làm ba lớp cơ bản:

1.  **Lớp Trình diễn (Presentation Layer - Frontend):** Được xây dựng bằng **React 19**, cấu trúc theo Next.js App Router. Giao diện sử dụng **Tailwind CSS v4** cho styling, **Framer Motion** cho các chuyển động vi mô (micro-animations) và **Recharts** để trực quan hóa dữ liệu tài chính.
2.  **Lớp Logic và Dịch vụ (Service Layer - Backend):** Chạy trực tiếp trên Node.js Serverless API của Next.js. Thực hiện xử lý nghiệp vụ tài chính, dinh dưỡng, lịch trình, xác thực người dùng (**NextAuth.js**), kết nối và truy vấn mô hình LLM qua **OpenClaw Gateway**, và chạy một tiến trình ngầm (**Background Worker**) để quét lịch biểu.
3.  **Lớp Dữ liệu (Data Layer - Database):** Sử dụng hệ quản trị cơ sở dữ liệu quan hệ **PostgreSQL**, được quản lý và tương tác thông qua **Prisma ORM (v7.8.0)** với mô hình dữ liệu đồng bộ.

---

## 2. Bản Đồ Cấu Trúc Thư Mục và Tệp Tin

Dưới đây là sơ đồ chi tiết cấu trúc mã nguồn của ứng dụng và vai trò của từng thư mục/tệp tin chính:

```
projectii-app/
├── prisma/                  # Quản lý cơ sở dữ liệu
│   ├── schema.prisma        # Khai báo mô hình dữ liệu (Data models)
│   └── seed.js              # Kịch bản khởi tạo dữ liệu mẫu
├── public/                  # Tài nguyên tĩnh (Ảnh, biểu tượng, âm thanh)
├── src/                     # Toàn bộ mã nguồn ứng dụng
│   ├── app/                 # Thư mục Routing của Next.js (App Router)
│   │   ├── (app)/           # Các trang chức năng yêu cầu đăng nhập
│   │   │   ├── budget/      # Giao diện Quản lý tài chính cá nhân
│   │   │   ├── calendar/    # Giao diện Lịch biểu tương tác
│   │   │   ├── chat/        # Giao diện Chatbot Star AI
│   │   │   ├── dashboard/   # Trang điều khiển trung tâm
│   │   │   ├── nutrition/   # Giao diện Quản lý dinh dưỡng, calo
│   │   │   ├── tasks/       # Giao diện Danh sách công việc cần làm
│   │   │   └── water/       # Giao diện Theo dõi nước uống
│   │   ├── api/             # Các API Endpoint của hệ thống
│   │   │   ├── auth/        # API xử lý Đăng ký/Đăng nhập (NextAuth)
│   │   │   ├── budget/      # API CRUD giao dịch và tài khoản tài chính
│   │   │   ├── chat/        # API cốt lõi xử lý AI Chatbot & Function Calling
│   │   │   ├── meals/       # API ước lượng khẩu phần và calo bữa ăn
│   │   │   └── water/       # API ghi nhật ký nước uống
│   │   ├── globals.css      # Cấu hình Tailwind CSS toàn cục
│   │   └── layout.tsx       # Layout gốc của ứng dụng
│   ├── components/          # Các UI Components dùng chung
│   │   ├── budget/          # Các Component con phục vụ trang Budget
│   │   ├── nutrition/       # Các Component con phục vụ trang Dinh dưỡng
│   │   ├── DraggableStar.tsx# Linh vật Star AI có thể kéo thả di động
│   │   └── OnboardingTour.tsx# Hướng dẫn người dùng mới sử dụng app
│   └── lib/                 # Thư viện và Helper dùng chung
│       ├── api.ts           # Helper xử lý yêu cầu API và xác thực
│       ├── auth.ts          # Cấu hình NextAuth (Credentials Provider)
│       ├── db.ts            # Khởi tạo Prisma Client (Singleton Pattern)
│       ├── backgroundWorker.ts # Tiến trình quét lịch biểu chạy ngầm
│       └── notify.ps1       # Script PowerShell đẩy thông báo lên Windows
```

---

## 3. Các Thành Phần Cốt Lõi và Nguyên Lý Hoạt Động

### 3.1. Cơ chế Hoạt động của Chatbot AI và Gọi công cụ (Function Calling Loop)
Tệp tin xử lý chính: [src/app/api/chat/route.ts](file:///C:/Users/nguye/OneDrive/Documents/ProjectII/projectii-app/src/app/api/chat/route.ts)

Khi người dùng gửi một tin nhắn đến hệ thống, quy trình sau sẽ diễn ra:
1.  **Nhận thông điệp:** API POST tiếp nhận tin nhắn của người dùng và lưu vào bảng `ChatMessage`.
2.  **Chuẩn bị lịch sử:** Hệ thống lấy tối đa 15 tin nhắn gần nhất trong phiên trò chuyện hiện tại để làm ngữ cảnh gửi cho AI, đi kèm với `SYSTEM_PROMPT` quy định tính cách trợ lý ảo và các quy tắc xử lý.
3.  **Gọi Cổng AI (OpenClaw):** Ứng dụng gọi API đến OpenClaw Gateway kèm theo danh sách các `tools` (công cụ mà AI được phép gọi như `log_transaction`, `get_budget_status`, `log_water`,...).
4.  **Vòng lặp gọi công cụ (Execution Loop):**
    *   Nếu mô hình quyết định gọi một hoặc nhiều công cụ (ví dụ: `get_budget_status` để xem danh sách tài khoản), nó sẽ trả về thông tin yêu cầu gọi tool trong thuộc tính `tool_calls`.
    *   Backend Next.js sẽ chặn lại, thực thi hàm `executeTool` tương ứng trong môi trường máy chủ để đọc/ghi cơ sở dữ liệu PostgreSQL qua Prisma.
    *   Kết quả thực thi cơ sở dữ liệu được chuyển đổi thành chuỗi JSON và gửi ngược lại cho AI ở vòng hội thoại tiếp theo.
    *   Cơ chế này lặp lại tối đa 4 lần. Điều này cho phép AI có thể gọi nhiều công cụ liên tiếp (ví dụ: tra cứu trạng thái ví trước, sau đó mới ghi nhận giao dịch).
5.  **Trả về phản hồi:** Khi AI không cần gọi thêm công cụ nào nữa, nó sẽ sinh ra câu thoại cuối cùng để trả về và hiển thị trên màn hình chat của người dùng.

### 3.2. Cơ chế Hoạt động của Tiến trình chạy ngầm (Background Worker)
Tệp tin xử lý chính: [src/lib/backgroundWorker.ts](file:///C:/Users/nguye/OneDrive/Documents/ProjectII/projectii-app/src/lib/backgroundWorker.ts) và [src/lib/notify.ps1](file:///C:/Users/nguye/OneDrive/Documents/ProjectII/projectii-app/src/lib/notify.ps1)

Background Worker đảm nhận vai trò nhắc nhở người dùng uống nước và thực hiện công việc đúng hạn:
1.  **Khởi động tự động:** Khi máy chủ khởi động và module kết nối cơ sở dữ liệu `db.ts` được tải lần đầu, Background Worker sẽ được import động và kích hoạt hàm `startBackgroundWorker()`. Một bộ hẹn giờ `setInterval` được thiết lập để chạy định kỳ mỗi **30 giây**.
2.  **Quét Dữ liệu:**
    *   **Nhiệm vụ (Tasks):** Tìm kiếm các task chưa hoàn thành có cài đặt nhắc nhở (`notification: true`) và có thời gian đến hạn nằm trong khoảng từ 15 phút trước cho đến 1 phút sau thời điểm hiện tại.
    *   **Sự kiện lịch (Events):** Tìm kiếm các sự kiện sắp diễn ra trong vòng 15 phút tới. Nếu sự kiện có thiết lập lặp lại (`recurrence`), helper sẽ tự động tính toán ra mốc thời gian thực tế của phiên bản lặp đó để đối chiếu.
    *   **Giờ uống nước (Water slots):** So sánh thời gian hiện tại (Định dạng HH:MM) với các mốc giờ hẹn uống nước đã cấu hình trong bảng `WaterReminderSlot`.
3.  **Đẩy Thông báo OS:**
    *   Nếu phát hiện sự kiện cần nhắc nhở chưa được gửi (kiểm tra qua bộ nhớ đệm `notifiedKeys`), worker sẽ kích hoạt hàm `triggerNotification`.
    *   Hàm này gọi một tiến trình con thực thi tệp tin PowerShell [notify.ps1](file:///C:/Users/nguye/OneDrive/Documents/ProjectII/projectii-app/src/lib/notify.ps1).
    *   Script PowerShell sử dụng API Windows Runtime (`Windows.UI.Notifications.ToastNotificationManager`) để hiển thị một thông báo Toast dạng bong bóng hệ thống gốc của Windows mang tên thương hiệu "Star AI". Nếu không thành công, nó sẽ tự động rơi về chế độ bóng khí Balloon Tip cũ để đảm bảo tính tương thích.

### 3.3. Cơ chế Kết nối Cơ sở dữ liệu và Khởi tạo tự động (Singleton Pattern)
Tệp tin xử lý chính: [src/lib/db.ts](file:///C:/Users/nguye/OneDrive/Documents/ProjectII/projectii-app/src/lib/db.ts)

Để tránh việc kết nối lại liên tục vào cơ sở dữ liệu làm rò rỉ cổng kết nối (Connection leak) trong quá trình Hot Reload của Next.js khi phát triển (Development mode), tệp tin `db.ts` áp dụng mô hình thiết kế **Singleton**:
*   Sử dụng biến `globalThis` để lưu trữ thể hiện (instance) của `PrismaClient`.
*   Nếu trên phạm vi toàn cục đã tồn tại kết nối Prisma, hệ thống sẽ sử dụng lại kết nối cũ; nếu chưa, hệ thống mới khởi tạo một kết nối mới thông qua adapter `PrismaPg`.
*   Trong môi trường Production, Next.js sẽ tái sử dụng kết nối theo cách thông thường của serverless.

---

## 4. Các Đoạn Mã Nguồn Quan Trọng

### 4.1. Vòng lặp xử lý Function Calling (Backend Chat)
Đoạn mã này nằm trong hàm `POST` của `/api/chat/route.ts`, điều phối việc gọi công cụ của AI:

```typescript
// Gửi yêu cầu ban đầu tới AI Gateway
let response = await callOpenClaw(apiMessages);

// Vòng lặp thực thi công cụ (Tối đa 4 vòng lặp để tránh lặp vô hạn)
let loop = 0;
while (response.choices?.[0]?.message?.tool_calls && loop < 4) {
  loop++;
  const toolCalls = response.choices[0].message.tool_calls;
  
  // Lưu trữ yêu cầu gọi công cụ của AI vào lịch sử hội thoại
  apiMessages.push(response.choices[0].message);

  // Duyệt qua từng công cụ được yêu cầu gọi
  for (const toolCall of toolCalls) {
    let args = {};
    try {
      args = typeof toolCall.function.arguments === "string" 
        ? JSON.parse(toolCall.function.arguments) 
        : toolCall.function.arguments;
    } catch (e) {
      console.error("Failed to parse tool arguments:", toolCall.function.arguments);
    }

    // Thực thi nghiệp vụ tương ứng với cơ sở dữ liệu ở phía Backend
    const result = await executeTool(toolCall.function.name, args, auth.userId!, session.id);

    // Trả kết quả thực thi cơ sở dữ liệu lại cho AI
    apiMessages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      name: toolCall.function.name,
      content: JSON.stringify(result),
    });
  }

  // Yêu cầu mô hình AI tiếp tục xử lý dựa trên dữ liệu mới nhận được từ công cụ
  response = await callOpenClaw(apiMessages);
}

// Trích xuất phản hồi dạng văn bản cuối cùng của AI
assistantReply = response.choices?.[0]?.message?.content || "Sao đã làm xong rồi nha bạn iu! 🥰";
```

### 4.2. Cơ chế Tự động Kích hoạt Background Worker (db.ts)
Tiến trình chạy ngầm được tích hợp kích hoạt thông minh mà không cần một dịch vụ hệ thống riêng biệt:

```typescript
// Kiểm tra nếu mã đang chạy ở môi trường máy chủ (window === undefined)
if (typeof window === "undefined") {
  const globalForWorker = globalThis as unknown as {
    backgroundWorkerStarted?: boolean;
  };
  
  // Đảm bảo chỉ khởi chạy duy nhất 1 luồng Background Worker trên máy chủ
  if (!globalForWorker.backgroundWorkerStarted) {
    globalForWorker.backgroundWorkerStarted = true;
    
    // Thực hiện nạp động (Dynamic Import) tiến trình ngầm để tránh nghẽn luồng khởi động
    import("./backgroundWorker")
      .then(({ startBackgroundWorker }) => {
        startBackgroundWorker();
      })
      .catch((err) => {
        console.error("Failed to start background worker:", err);
      });
  }
}
```

### 4.3. Quét sự kiện lặp lại (backgroundWorker.ts)
Đoạn mã chịu trách nhiệm ánh xạ và tính toán thời gian cho các sự kiện lịch trình có tính chất lặp lại định kỳ:

```typescript
function getActiveRecurringInstances(event: any, startWindow: Date, endWindow: Date) {
  // Nếu sự kiện không lặp lại, trả về chính nó
  if (!event.recurrence || event.recurrence === "NONE") {
    return [event];
  }

  const instances = [];
  let currentStart = new Date(event.startAt);
  let currentEnd = new Date(event.endAt);
  const limitDate = event.recurrenceEnd ? new Date(event.recurrenceEnd) : addMonths(new Date(), 6);
  const durationMs = currentEnd.getTime() - currentStart.getTime();

  // Tịnh tiến mốc thời gian để tìm các bản thể lặp rơi trúng khung thời gian quét hiện tại
  while (currentStart <= limitDate) {
    if (currentStart >= startWindow && currentStart <= endWindow) {
      instances.push({
        ...event,
        startAt: new Date(currentStart),
        endAt: new Date(currentStart.getTime() + durationMs),
      });
    }

    if (event.recurrence === "DAILY") {
      currentStart = addDays(currentStart, 1);
    } else if (event.recurrence === "WEEKLY") {
      currentStart = addWeeks(currentStart, 1);
    } else if (event.recurrence === "MONTHLY") {
      currentStart = addMonths(currentStart, 1);
    } else {
      break;
    }
  }
  return instances;
}
```

### 4.4. Đẩy thông báo hệ thống thông qua WinRT API (PowerShell Script)
Kịch bản PowerShell gọi API Windows Runtime gốc của máy chủ/máy trạm để hiển thị Toast Notification:

```powershell
param (
    [string]$Title,
    [string]$Message
)

try {
    # Nạp các kiểu dữ liệu của Windows Runtime
    $null = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
    $Template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
    $ToastXml = [xml]$Template.GetXml()
    
    # Gán tiêu đề và nội dung vào cấu trúc XML của Toast
    $null = $ToastXml.GetElementsByTagName('text')[0].AppendChild($ToastXml.CreateTextNode($Title))
    $null = $ToastXml.GetElementsByTagName('text')[1].AppendChild($ToastXml.CreateTextNode($Message))
    
    $Xml = New-Object Windows.Data.Xml.Dom.XmlDocument
    $Xml.LoadXml($ToastXml.OuterXml)
    
    # Khởi tạo và hiển thị Toast thông báo dưới tên định danh 'Star AI'
    $Toast = New-Object Windows.UI.Notifications.ToastNotification $Xml
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Star AI').Show($Toast)
} catch {
    # Cơ chế phòng vệ: Tự động rơi về balloon tip dạng cũ của Windows Forms nếu WinRT không khả dụng
    [void] [System.Reflection.Assembly]::LoadWithPartialName("System.Windows.Forms")
    $objNotifyIcon = New-Object System.Windows.Forms.NotifyIcon
    $objNotifyIcon.Icon = [System.Drawing.SystemIcons]::Information
    $objNotifyIcon.BalloonTipText = $Message
    $objNotifyIcon.BalloonTipTitle = $Title
    $objNotifyIcon.Visible = $True
    $objNotifyIcon.ShowBalloonTip(10000)
    Start-Sleep -Seconds 2
    $objNotifyIcon.Dispose()
}
```
