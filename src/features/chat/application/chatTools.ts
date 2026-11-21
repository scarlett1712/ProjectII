/** Function-calling tool definitions included in each LLM request. */
export const CHAT_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_profile",
      description: "Lấy thông tin hồ sơ sức khỏe hiện tại của người dùng (tuổi, chiều cao, cân nặng, giới tính, mức độ hoạt động).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "update_profile_and_recalculate_goals",
      description: "Cập nhật thông tin hồ sơ sức khỏe và tự động tính toán lại mục tiêu calo, lượng nước hàng ngày.",
      parameters: {
        type: "object",
        properties: {
          gender: { type: "string", enum: ["MALE", "FEMALE", "OTHER"], description: "Giới tính (MALE, FEMALE, OTHER)" },
          weightKg: { type: "number", description: "Cân nặng (kg)" },
          heightCm: { type: "number", description: "Chiều cao (cm)" },
          age: { type: "number", description: "Tuổi" },
          activityLevel: { type: "string", enum: ["sedentary", "light", "moderate", "active", "very_active"], description: "Mức độ hoạt động" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_water",
      description: "Ghi nhận lượng nước đã uống (ml).",
      parameters: {
        type: "object",
        properties: {
          amountMl: { type: "number", description: "Lượng nước uống vào (ml)" },
        },
        required: ["amountMl"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_meal",
      description: "Ghi lại bữa ăn mới với tên món ăn và số calo.",
      parameters: {
        type: "object",
        properties: {
          mealName: { type: "string", description: "Tên món ăn hoặc bữa ăn" },
          calories: { type: "number", description: "Lượng calo ước tính (kcal)" },
          grams: { type: "number", description: "Khối lượng thức ăn (gram), mặc định 100 nếu không rõ" },
          note: { type: "string", enum: ["Sáng", "Trưa", "Tối", "Vặt"], description: "Bữa ăn loại nào" },
        },
        required: ["mealName", "calories"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_task",
      description: "Thêm một công việc (task/todo) mới cần làm.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Tiêu đề công việc" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_event",
      description: "Thêm một sự kiện mới vào lịch biểu.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Tiêu đề sự kiện" },
          startAt: { type: "string", description: "Thời gian bắt đầu (định dạng ISO 8601 kèm múi giờ Việt Nam +07:00, ví dụ: '2026-11-15T08:00:00+07:00')" },
          endAt: { type: "string", description: "Thời gian kết thúc (định dạng ISO 8601 kèm múi giờ Việt Nam +07:00, ví dụ: '2026-11-15T09:00:00+07:00')" },
        },
        required: ["title", "startAt", "endAt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_nutrition_history",
      description: "Lấy lịch sử ăn uống và calo đã nạp của người dùng trong một số ngày gần đây.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Số ngày gần đây muốn xem lịch sử (mặc định 7 ngày)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_water_history",
      description: "Lấy lịch sử uống nước của người dùng trong một số ngày gần đây.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Số ngày gần đây muốn xem lịch sử (mặc định 7 ngày)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_tasks_and_events",
      description: "Xem danh sách công việc (tasks) chưa hoàn thành và lịch trình/sự kiện (events) của người dùng. Có thể lọc theo từ khóa tìm kiếm hoặc khoảng thời gian.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Từ khóa tìm kiếm sự kiện hoặc công việc (ví dụ: 'Sắn', 'đi làm',...)" },
          startDate: { type: "string", description: "Thời gian bắt đầu lọc, định dạng ISO String (ví dụ: '2026-06-01T00:00:00.000Z')" },
          endDate: { type: "string", description: "Thời gian kết thúc lọc, định dạng ISO String (ví dụ: '2026-06-30T23:59:59.000Z')" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "log_transaction",
      description: "Ghi nhận một giao dịch tài chính mới (thu nhập, chi tiêu, hoặc chuyển khoản).",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Số tiền giao dịch (VND)" },
          type: { type: "string", enum: ["EXPENSE", "INCOME", "TRANSFER"], description: "Loại giao dịch (EXPENSE: Chi tiêu, INCOME: Thu nhập, TRANSFER: Chuyển khoản)" },
          categoryName: { type: "string", description: "Tên danh mục phân loại (ví dụ: 'Ăn uống', 'Di chuyển', 'Lương', ...). Có thể bỏ trống đối với giao dịch chuyển khoản." },
          fromAccountName: { type: "string", description: "Tên tài khoản nguồn chi hoặc tài khoản chuyển (ví dụ: 'ABBank', 'Ví tiền mặt', ...). Cần thiết cho chi tiêu và chuyển khoản." },
          toAccountName: { type: "string", description: "Tên tài khoản nhận tiền (ví dụ: 'ABBank', 'Momo', ...). Cần thiết cho thu nhập và chuyển khoản." },
          note: { type: "string", description: "Ghi chú cho giao dịch (ví dụ: 'Ăn sáng phở bò', 'Chuyển quỹ tiết kiệm', ...)" }
        },
        required: ["amount", "type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_budget_status",
      description: "Xem danh sách tài khoản tài chính, số dư và các danh mục phân loại chi tiêu/thu nhập hiện tại.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_transaction_history",
      description: "Xem lịch sử giao dịch tài chính/xèng xèng (thu nhập, chi tiêu, chuyển khoản) của người dùng. Có thể lọc theo khoảng thời gian (startDate, endDate) hoặc loại giao dịch.",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "Thời gian bắt đầu lọc, định dạng ISO String (ví dụ: '2026-07-01T00:00:00.000Z')" },
          endDate: { type: "string", description: "Thời gian kết thúc lọc, định dạng ISO String (ví dụ: '2026-07-31T23:59:59.000Z')" },
          type: { type: "string", enum: ["EXPENSE", "INCOME", "TRANSFER"], description: "Lọc theo loại giao dịch (EXPENSE: Chi tiêu, INCOME: Thu nhập, TRANSFER: Chuyển khoản)" },
          limit: { type: "number", description: "Số lượng giao dịch tối đa muốn lấy (mặc định là 50)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Tìm kiếm thông tin thời gian thực trên Internet, báo chí và tin tức: sự kiện đang diễn ra, tin tức thời sự, thời tiết, địa điểm, sự kiện tại các tỉnh thành (ví dụ: 'sự kiện Hà Nội', 'thời tiết hôm nay', 'tin tức mới')",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Từ khóa tìm kiếm trên Internet" }
        },
        required: ["query"]
      }
    }
  }
];
