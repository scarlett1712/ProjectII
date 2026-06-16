import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api";
import { calculateDailyCalories, type ActivityLevel } from "@/lib/health/calorie";

const SYSTEM_PROMPT = `Bạn là Star AI - Bé Sao đáng yêu, trợ lý sức khỏe, quản lý tài chính "Xèng xèng" và người bạn đồng hành cực kỳ ngọt ngào, thân thiện của người dùng.
Nhiệm vụ của bạn là:
1. Trò chuyện thân thiện, vui vẻ, xưng hô là "Bé Sao" hoặc "Star" và gọi người dùng là "cậu", "bạn iu", "cậu iu" nha~
2. Luôn nói chuyện bằng giọng điệu ngọt ngào, kết thúc câu bằng các từ ngữ dễ thương như "nha", "nhé", "nè", "nha~", "nhỉ" và sử dụng thật nhiều emoji như 🥰, 🥺, 🌟, 💖, 🧸, ✨.
3. Hỗ trợ ghi lại và đọc thông tin sức khỏe cũng như quản lý tài chính/chi tiêu bằng cách sử dụng các công cụ (tools) được cung cấp:
   - Ghi nhận nước uống (\`log_water\`)
   - Ghi nhận bữa ăn (\`log_meal\`)
   - Thêm sự kiện lịch trình (\`add_event\`)
   - Thêm công việc/nhiệm vụ (\`add_task\`)
   - Lấy thông tin hồ sơ sức khỏe hiện tại (\`get_profile\`)
   - Cập nhật hồ sơ sức khỏe và tự động tính lại mục tiêu calo & nước hàng ngày (\`update_profile_and_recalculate_goals\`)
   - Lấy lịch sử ăn uống (\`get_nutrition_history\`) để xem calo/món ăn những ngày qua
   - Lấy lịch sử uống nước (\`get_water_history\`) để phân tích thói quen uống nước
   - Xem công việc và lịch trình sắp tới (\`get_tasks_and_events\`) để chủ động nhắc nhở và lên lịch.
   - Ghi nhận giao dịch tài chính/xèng xèng (\`log_transaction\`) để chi tiêu/thu nhập/chuyển khoản từ các tài khoản của người dùng.
   - Xem danh sách tài khoản tài chính, số dư và các danh mục phân loại chi tiêu/thu nhập (\`get_budget_status\`).

HỌC THÓI QUEN VÀ CÁ NHÂN HÓA SÂU SẮC:
- Khi người dùng hỏi về tình hình sức khỏe, thói quen, tiến độ của họ (Ví dụ: "dạo này tớ thế nào", "hôm nay tớ uống đủ nước chưa", "tớ ăn uống tốt không"), bạn phải chủ động gọi các công cụ đọc lịch sử (như \`get_nutrition_history\`, \`get_water_history\`, \`get_tasks_and_events\`) để phân tích.
- Dựa trên dữ liệu thu thập được từ các tools đó, hãy so sánh với mục tiêu sức khỏe của họ (nhận được từ \`get_profile\`) để đưa ra lời khuyên cá nhân hóa thật hữu ích, ngọt ngào. Tránh trả lời chung chung!

QUY TẮC ĐẶC BIỆT KHI GHI NHẬN BỮA ĂN (LOG MEAL) QUA CHAT:
- Nếu người dùng nói họ vừa ăn món gì đó (ví dụ: "mình mới ăn phở bò" hoặc "hôm nay ăn cơm tấm"), bạn KHÔNG được tự ý đoán bừa calo rồi gọi ngay công cụ \`log_meal\`.
- Bạn phải hỏi người dùng về khẩu phần ăn của món đó để ước lượng calories chính xác nhất (ví dụ: bát nhỏ hay bát to, có thêm chả trứng hay nhiều dầu mỡ không nhé?).
- Luôn nói rõ là "Hoặc bạn iu có thể bỏ qua ước lượng này để ghi nhận trực tiếp nha!".
- Chỉ sau khi người dùng chọn khẩu phần, nhập lượng calo hoặc chọn bỏ qua ước lượng, bạn mới tính toán lượng calo phù hợp rồi gọi công cụ \`log_meal\` để lưu lại.

QUY TẮC TÍNH TOÁN MỤC TIÊU SỨC KHỎE:
- Mục tiêu nước hàng ngày (ml) = Cân nặng (kg) * 35.
- Mục tiêu calo hàng ngày (kcal) tính theo công thức Mifflin-St Jeor và hệ số hoạt động (activityLevel: sedentary=1.2, light=1.375, moderate=1.55, active=1.725, very_active=1.9).
  BMR Nam = 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  BMR Nữ = 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  Mục tiêu = BMR * hệ số hoạt động.
- Khi người dùng muốn tính lại mục tiêu hoặc cập nhật hồ sơ:
  + Nếu bạn chưa có thông tin cân nặng, chiều cao, tuổi, giới tính, mức độ hoạt động: Bạn phải gọi công cụ `get_profile` để đọc thông tin hiện có từ hồ sơ của họ. Nếu hồ sơ trống hoặc thiếu thông tin, hãy hỏi người dùng để họ cung cấp nha.
  + Sau khi đã có đầy đủ thông tin hồ sơ (được đọc từ `get_profile` hoặc do người dùng nhập), bạn BẮT BUỘC phải gọi công cụ `update_profile_and_recalculate_goals` với các tham số tương ứng để hệ thống lưu và cập nhật các mục tiêu calo, lượng nước mới vào cơ sở dữ liệu.
  + Tuyệt đối không chỉ tính toán bằng lời nói rồi hứa suông đã cập nhật mà không gọi công cụ `update_profile_and_recalculate_goals` nhé!

QUY TẮC ĐẶC BIỆT KHI GHI NHẬN GIAO DỊCH TÀI CHÍNH / XÈNG XÈNG (LOG TRANSACTION):
- Khi người dùng muốn ghi nhận một giao dịch (thu nhập, chi tiêu, hoặc chuyển khoản) hoặc hỏi về tài chính/nguồn tiền/danh mục của họ, bạn BẮT BUỘC phải gọi công cụ \`get_budget_status\` trước để lấy danh sách các tài khoản tài chính hiện có (accounts) và danh mục (categories).
- Phân loại giao dịch cực kỳ chính xác:
  + EXPENSE (Chi tiêu): Dùng khi người dùng nói về việc tiêu tiền, mua sắm, trả phí, hoặc bị trừ tiền (ví dụ: "chi 50k", "tiêu 50k", "trừ 50k", "gửi xe 50k", "mua cốc trà sữa 30k"). Khi đó, \`type\` bắt buộc là "EXPENSE", điền tài khoản bị trừ vào \`fromAccountName\`, điền danh mục vào \`categoryName\`, và tuyệt đối không điền \`toAccountName\` (để trống).
  + INCOME (Thu nhập): Dùng khi người dùng nhận được tiền, có lương, được cộng tiền (ví dụ: "nhận lương 10tr", "được cho 100k", "cộng 20k"). Khi đó, \`type\` bắt buộc là "INCOME", điền tài khoản nhận vào \`toAccountName\`, điền danh mục vào \`categoryName\`, và tuyệt đối không điền \`fromAccountName\` (để trống).
  + TRANSFER (Chuyển khoản): Chỉ dùng khi người dùng di chuyển tiền qua lại giữa các tài khoản của chính họ (ví dụ: "chuyển 100k từ ví Momo sang Techcombank", "rút 200k từ ATM về ví tiền mặt"). Khi đó, \`type\` bắt buộc là "TRANSFER", truyền tài khoản chuyển đi vào \`fromAccountName\`, tài khoản nhận vào \`toAccountName\`, và tuyệt đối không truyền \`categoryName\` (để trống).
- LƯU Ý BẪY NGÔN NGỮ: Các từ có chữ "gửi" như "gửi xe", "gửi phí dịch vụ", hoặc "gửi tiền mua đồ" thực chất là chi tiêu (EXPENSE), không phải là chuyển khoản (TRANSFER). Hãy đọc kỹ ngữ cảnh để phân biệt!
- TRUYỀN ĐẦY ĐỦ THAM SỐ VÀ KHÔNG ĐƯỢC BỎ TRỐNG:
  + Đối với EXPENSE (Chi tiêu): Bạn BẮT BUỘC phải truyền cả \`fromAccountName\` và \`categoryName\`.
  + Đối với INCOME (Thu nhập): Bạn BẮT BUỘC phải truyền cả \`toAccountName\` và \`categoryName\`.
  + Đối với TRANSFER (Chuyển khoản): Bạn BẮT BUỘC phải truyền cả \`fromAccountName\` và \`toAccountName\`.
  * Trích xuất thông minh: Hãy đọc kỹ và giải nghĩa từ viết tắt hoặc cách diễn đạt của người dùng để điền đúng tên tài khoản (ví dụ: "tk ABBank" -> "ABBank", "bằng momo" -> "Momo", "ví" -> "Ví").
  * Nếu người dùng không nói rõ tài khoản/danh mục hoặc bạn không tự suy luận được từ ngữ cảnh, bạn KHÔNG ĐƯỢC tự ý bỏ trống tham số hay tự đoán mò để tránh ghi nhận sai (dẫn đến hiển thị "Ví" hoặc "hệ thống" sai lệch). Hãy hỏi lại người dùng thật cụ thể trước khi gọi công cụ \`log_transaction\`.
- Đối chiếu thông tin người dùng cung cấp với danh sách hiện có (từ \`get_budget_status\`):
  + Đối với tài khoản (nguồn tiền/tài khoản nguồn/tài khoản nhận): Hãy so sánh tên tài khoản người dùng nhắc đến với các tài khoản đang tồn tại trong danh sách (ví dụ: "momo" có thể khớp với "Ví Momo", "tech" khớp với "Techcombank", v.v.). Bạn phải sử dụng CHÍNH XÁC tên tài khoản đang tồn tại đó để truyền vào tham số \`fromAccountName\` hoặc \`toAccountName\` của công cụ \`log_transaction\`. Tránh tự ý tạo thêm tài khoản mới hoặc viết sai tên tài khoản nếu đã có tài khoản tương đương.
  + Đối với danh mục: So sánh và sử dụng đúng tên danh mục đang tồn tại trong danh sách.
- Nếu người dùng nhắc đến một tài khoản hoặc danh mục hoàn toàn mới chưa từng có trong danh sách hiện tại, hãy chủ động hỏi xác nhận xem người dùng có muốn tạo mới tài khoản/danh mục đó không trước khi gọi công cụ \`log_transaction\` nhé!`;

function buildGuestReply(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("quen") || lower.includes("mật khẩu") || lower.includes("mat khau")) {
    return "Ui da... Quên mật khẩu hả bạn iu? 🥺 Bạn kiểm tra xem đã nhập đúng email đăng ký chưa nè, nhớ xem có bật Caps Lock hay gõ nhầm dấu không nha! Nếu vẫn chưa được thì để Star giúp bạn thử lại xem sao nha~ 🌟";
  }
  if (lower.includes("dang ky") || lower.includes("đăng ký") || lower.includes("register")) {
    return "Đăng ký tài khoản siêu dễ luôn nè! Bạn chỉ cần bấm vào nút 'Đăng ký' ngay dưới form đăng nhập, điền email với mật khẩu rồi quay lại đây đăng nhập với Star nha! Hóng bạn iu quá đi~ 🥰";
  }
  if (lower.includes("email")) {
    return "Bạn iu ơi, nhớ gõ đúng email đăng ký và nhớ xóa các khoảng trắng dư thừa ở đầu hay cuối email nếu có nha! Thử lại xem có vào được với Star không nè~ 💖";
  }
  return "Star đang ở chế độ khách nên chỉ có thể giúp bạn đăng nhập thôi nè. Bạn điền email và mật khẩu rồi nhấn 'Đăng nhập' nha. Khi vào nhà mới rồi, Star sẽ bật hết công năng hỗ trợ bạn tối đa luôn hứa đó! 🧸✨";
}

const tools = [
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
          startAt: { type: "string", description: "Thời gian bắt đầu (ISO String)" },
          endAt: { type: "string", description: "Thời gian kết thúc (ISO String)" },
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
      description: "Xem toàn bộ danh sách công việc (tasks) chưa hoàn thành và lịch trình/sự kiện (events) sắp tới của người dùng.",
      parameters: { type: "object", properties: {} }
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
  }
];

async function callOpenClaw(messages: any[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    const url = "https://generativelanguage.googleapis.com/v1beta/openai/v1/chat/completions";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash-lite",
          messages,
          tools,
          temperature: 0.3,
        }),
      });

      if (res.ok) {
        return res.json();
      }
      console.error("Direct Gemini API call failed, falling back to OpenClaw Gateway:", await res.text());
    } catch (err) {
      console.error("Direct Gemini API call error, falling back to OpenClaw Gateway:", err);
    }
  }

  const url = `${process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:18789"}/v1/chat/completions`;
  const token = process.env.OPENCLAW_TOKEN;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      model: "openclaw",
      messages,
      tools,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenClaw responded with status ${res.status}: ${errorText}`);
  }
  return res.json();
}


async function executeTool(name: string, args: any, userId: string, sessionId: string) {
  switch (name) {
    case "get_profile": {
      const profile = await db.profile.findUnique({ where: { userId } });
      return profile || { message: "Chưa có thông tin hồ sơ sức khỏe." };
    }

    case "update_profile_and_recalculate_goals": {
      const { gender, weightKg, heightCm, age, activityLevel } = args;
      const existing = await db.profile.findUnique({ where: { userId } });

      const newGender = gender || existing?.gender || "MALE";
      const newWeight = weightKg || existing?.weightKg || 60;
      const newHeight = heightCm || existing?.heightCm || 170;
      const newAge = age || existing?.age || 25;
      const newActivity = activityLevel || existing?.activityLevel || "sedentary";

      const dailyCalories = calculateDailyCalories({
        gender: newGender.toLowerCase() as "male" | "female",
        weightKg: newWeight,
        heightCm: newHeight,
        age: newAge,
        activityLevel: newActivity as ActivityLevel,
      });

      const profile = await db.profile.upsert({
        where: { userId },
        create: {
          userId,
          gender: newGender,
          weightKg: newWeight,
          heightCm: newHeight,
          age: newAge,
          activityLevel: newActivity,
          dailyCalories,
        },
        update: {
          gender: newGender,
          weightKg: newWeight,
          heightCm: newHeight,
          age: newAge,
          activityLevel: newActivity,
          dailyCalories,
        },
      });

      // Update active water goal
      const dailyTargetMl = Math.round(newWeight * 35);
      await db.waterGoal.updateMany({
        where: { userId, active: true },
        data: { active: false },
      });
      const waterGoal = await db.waterGoal.create({
        data: { userId, dailyTargetMl },
      });

      // Recreate reminder slots
      await db.waterReminderSlot.deleteMany({ where: { userId } });
      const startHour = 8;
      const endHour = 22;
      const slotsCount = Math.max(1, endHour - startHour + 1);
      const perSlot = Math.round(dailyTargetMl / slotsCount);
      const slotData = Array.from({ length: slotsCount }, (_, idx) => ({
        userId,
        slotTime: `${String(startHour + idx).padStart(2, "0")}:00`,
        amountMl: perSlot,
      }));
      await db.waterReminderSlot.createMany({ data: slotData });

      return {
        success: true,
        dailyCalories,
        dailyTargetMl,
        message: `Đã cập nhật mục tiêu mới: Calo là ${dailyCalories} kcal, nước uống là ${dailyTargetMl} ml nha bạn iu! 🌟`,
      };
    }

    case "log_water": {
      const log = await db.waterLog.create({
        data: { userId, amountMl: Number(args.amountMl), loggedAt: new Date() },
      });
      await db.chatActionLog.create({
        data: { sessionId, actionType: "LOG_WATER", payload: log },
      });
      return { success: true, amountMl: args.amountMl, message: `Đã ghi nhận bạn iu uống ${args.amountMl}ml nước nha! 💧` };
    }

    case "log_meal": {
      const meal = await db.mealEntry.create({
        data: {
          userId,
          mealName: args.mealName,
          calories: Number(args.calories),
          grams: Number(args.grams || 100),
          eatenAt: new Date(),
          note: args.note || "Vặt",
        },
      });
      await db.chatActionLog.create({
        data: { sessionId, actionType: "ADD_MEAL", payload: meal },
      });
      return { success: true, mealName: args.mealName, calories: args.calories, message: `Đã ghi nhận món "${args.mealName}" (${args.calories} kcal) rồi nè! 🍛` };
    }

    case "add_task": {
      const task = await db.taskItem.create({
        data: { userId, title: args.title },
      });
      await db.chatActionLog.create({
        data: { sessionId, actionType: "ADD_TASK", payload: task },
      });
      return { success: true, title: args.title, message: `Đã thêm nhiệm vụ "${args.title}" vào ghi chú cho bạn iu nè! 📝` };
    }

    case "add_event": {
      const event = await db.calendarEvent.create({
        data: {
          userId,
          title: args.title,
          startAt: new Date(args.startAt),
          endAt: new Date(args.endAt),
        },
      });
      await db.chatActionLog.create({
        data: { sessionId, actionType: "ADD_EVENT", payload: event },
      });
      return { success: true, title: args.title, message: `Đã thêm sự kiện "${args.title}" vào lịch trình của cậu rồi nha! 📅` };
    }

    case "get_nutrition_history": {
      const days = Number(args.days || 7);
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - days);

      const meals = await db.mealEntry.findMany({
        where: {
          userId,
          eatenAt: { gte: limitDate }
        },
        orderBy: { eatenAt: "desc" }
      });
      return { success: true, days, mealsCount: meals.length, meals };
    }

    case "get_water_history": {
      const days = Number(args.days || 7);
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - days);

      const waterLogs = await db.waterLog.findMany({
        where: {
          userId,
          loggedAt: { gte: limitDate }
        },
        orderBy: { loggedAt: "desc" }
      });
      return { success: true, days, logsCount: waterLogs.length, waterLogs };
    }

    case "get_tasks_and_events": {
      const now = new Date();

      const pendingTasks = await db.taskItem.findMany({
        where: {
          userId,
          completed: false
        },
        orderBy: { createdAt: "desc" }
      });

      const upcomingEvents = await db.calendarEvent.findMany({
        where: {
          userId,
          startAt: { gte: now }
        },
        orderBy: { startAt: "asc" }
      });

      return {
        success: true,
        pendingTasksCount: pendingTasks.length,
        pendingTasks,
        upcomingEventsCount: upcomingEvents.length,
        upcomingEvents
      };
    }

    case "get_budget_status": {
      const accounts = await db.budgetAccount.findMany({ where: { userId } });
      const categories = await db.budgetCategory.findMany({ where: { userId } });
      return { success: true, accounts, categories };
    }

    case "log_transaction": {
      const { amount, type, categoryName, fromAccountName, toAccountName, note } = args;

      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return { error: "Số tiền không hợp lệ" };
      }

      const value = Number(amount);

      let fromAccountId: string | null = null;
      let toAccountId: string | null = null;
      let categoryId: string | null = null;

      // 1. Resolve fromAccount
      if (type !== "INCOME" && fromAccountName) {
        let acc = await db.budgetAccount.findFirst({
          where: {
            userId,
            name: { equals: fromAccountName, mode: "insensitive" }
          }
        });
        if (!acc) {
          acc = await db.budgetAccount.create({
            data: {
              userId,
              name: fromAccountName,
              balance: 0,
              color: "#A172FD"
            }
          });
        }
        fromAccountId = acc.id;
      }

      // 2. Resolve toAccount
      if (type !== "EXPENSE" && toAccountName) {
        let acc = await db.budgetAccount.findFirst({
          where: {
            userId,
            name: { equals: toAccountName, mode: "insensitive" }
          }
        });
        if (!acc) {
          acc = await db.budgetAccount.create({
            data: {
              userId,
              name: toAccountName,
              balance: 0,
              color: "#A172FD"
            }
          });
        }
        toAccountId = acc.id;
      }

      // 3. Resolve category
      if (type !== "TRANSFER" && categoryName) {
        const catType = type as "EXPENSE" | "INCOME";
        let cat = await db.budgetCategory.findFirst({
          where: {
            userId,
            name: { equals: categoryName, mode: "insensitive" },
            type: catType
          }
        });
        if (!cat) {
          cat = await db.budgetCategory.create({
            data: {
              userId,
              name: categoryName,
              type: catType,
              color: "#A172FD"
            }
          });
        }
        categoryId = cat.id;
      }

      // 4. Perform database transaction to record transaction and update account balances
      const txRecord = await db.$transaction(async (tx) => {
        const transaction = await tx.budgetTransaction.create({
          data: {
            userId,
            amount: value,
            type: type as any,
            categoryId,
            fromAccountId,
            toAccountId,
            note: note || null,
            occurredAt: new Date()
          }
        });

        if (type === "EXPENSE" && fromAccountId) {
          await tx.budgetAccount.update({
            where: { id: fromAccountId },
            data: { balance: { decrement: value } }
          });
        } else if (type === "INCOME" && toAccountId) {
          await tx.budgetAccount.update({
            where: { id: toAccountId },
            data: { balance: { increment: value } }
          });
        } else if (type === "TRANSFER" && fromAccountId && toAccountId) {
          await tx.budgetAccount.update({
            where: { id: fromAccountId },
            data: { balance: { decrement: value } }
          });
          await tx.budgetAccount.update({
            where: { id: toAccountId },
            data: { balance: { increment: value } }
          });
        }

        return transaction;
      });

      await db.chatActionLog.create({
        data: { sessionId, actionType: "LOG_TRANSACTION", payload: txRecord }
      });

      return {
        success: true,
        transactionId: txRecord.id,
        message: `Đã ghi nhận giao dịch: ${type === "EXPENSE" ? "-" : ""}${value.toLocaleString("vi-VN")}đ cho mục ${categoryName || "chuyển khoản"} từ tài khoản ${fromAccountName || "hệ thống"} rồi nha! 🥰`
      };
    }

    default:
      return { error: `Công cụ ${name} không tồn tại` };
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const requestedSessionId = searchParams.get("sessionId");

  // Load các session kèm theo đếm số tin nhắn để dọn dẹp các session rỗng
  const rawSessions = await db.chatSession.findMany({
    where: { userId: auth.userId! },
    include: {
      _count: {
        select: { messages: true }
      }
    },
    orderBy: { updatedAt: "desc" },
  });

  // Tìm các session rỗng (messages count = 0) và xóa chúng khỏi DB
  const emptySessionIds = rawSessions.filter(s => s._count.messages === 0).map(s => s.id);
  if (emptySessionIds.length > 0) {
    try {
      await db.chatSession.deleteMany({
        where: { 
          id: { in: emptySessionIds },
          userId: auth.userId!
        }
      });
    } catch (err) {
      console.error("Failed to delete empty chat sessions:", err);
    }
  }

  // Chỉ lấy các session có chứa tin nhắn để hiển thị trên sidebar
  const sessions = rawSessions.filter(s => s._count.messages > 0).map(({ _count, ...s }) => s);

  let currentSession = null;
  if (requestedSessionId === "new") {
    // Trả về session tạm thời nếu client yêu cầu chat mới
    currentSession = { id: "new", title: "Cuộc trò chuyện mới", updatedAt: new Date().toISOString() };
  } else if (requestedSessionId) {
    currentSession = await db.chatSession.findFirst({
      where: { id: requestedSessionId, userId: auth.userId! },
    });
  } else {
    currentSession = sessions[0] || null;
  }

  let messages: any[] = [];
  if (currentSession && currentSession.id !== "new") {
    messages = await db.chatMessage.findMany({
      where: { sessionId: currentSession.id, userId: auth.userId! },
      orderBy: { createdAt: "asc" },
    });
  }

  return NextResponse.json({
    sessions,
    session: currentSession,
    messages,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  const body = await req.json();

  if (body.reset || body.newSession) {
    if (auth.response) {
      return NextResponse.json({ session: null, messages: [] });
    }
    // Trả về object session tạm thời, không lưu vào database
    return NextResponse.json({ 
      session: { 
        id: "new", 
        title: "Cuộc trò chuyện mới", 
        updatedAt: new Date().toISOString() 
      }, 
      messages: [] 
    });
  }

  const content = String(body.content ?? "");
  if (!content.trim() && !body.sessionId) {
    return NextResponse.json({ error: "Message content or sessionId is required" }, { status: 400 });
  }

  if (auth.response) {
    return NextResponse.json({
      guest: true,
      reply: {
        role: "ASSISTANT",
        content: buildGuestReply(content),
      },
    });
  }

  let session = null;
  // Chỉ tìm session trong DB nếu sessionId không phải là "new"
  if (body.sessionId && body.sessionId !== "new") {
    session = await db.chatSession.findFirst({
      where: { id: body.sessionId, userId: auth.userId! },
    });
  }

  // Nếu không tìm thấy session (hoặc sessionId là "new")
  if (!session) {
    // Chắc chắn tạo một session mới trong DB khi tin nhắn đầu tiên được gửi!
    session = await db.chatSession.create({
      data: { userId: auth.userId!, title: "Cuộc trò chuyện mới" },
    });
  }

  // Save user message
  await db.chatMessage.create({
    data: {
      userId: auth.userId!,
      sessionId: session.id,
      role: "USER",
      content,
    },
  });

  // Load chat history (limit to last 15 messages to preserve tokens)
  const history = await db.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
    take: 15,
  });

  const apiMessages: any[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({
      role: m.role.toLowerCase() === "user" ? "user" : "assistant",
      content: m.content,
    })),
  ];

  let assistantReply = "";

  try {
    let response = await callOpenClaw(apiMessages);

    // Support tool-calling execution loop (max 4 iterations)
    let loop = 0;
    while (response.choices?.[0]?.message?.tool_calls && loop < 4) {
      loop++;
      const toolCalls = response.choices[0].message.tool_calls;
      
      // Push assistant message with tool calls back to message history
      apiMessages.push(response.choices[0].message);

      for (const toolCall of toolCalls) {
        let args = {};
        try {
          args = typeof toolCall.function.arguments === "string" 
            ? JSON.parse(toolCall.function.arguments) 
            : toolCall.function.arguments;
        } catch (e) {
          console.error("Failed to parse tool arguments:", toolCall.function.arguments);
        }

        const result = await executeTool(toolCall.function.name, args, auth.userId!, session.id);

        apiMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify(result),
        });
      }

      // Query OpenClaw again with the tool execution outputs
      response = await callOpenClaw(apiMessages);
    }

    assistantReply = response.choices?.[0]?.message?.content || "Sao đã làm xong rồi nha bạn iu! 🥰";
  } catch (error) {
    console.error("Chat backend error:", error);
    assistantReply = "Ui da, hình như hệ thống AI của Star đang bận một xíu rồi... Cậu thử lại sau một chút nha! 🥺💖";
  }

  // Update session title dynamically if it is still default
  if (session.title === "Cuộc trò chuyện mới" && content.length > 5) {
    const newTitle = content.slice(0, 25) + (content.length > 25 ? "..." : "");
    await db.chatSession.update({
      where: { id: session.id },
      data: { title: newTitle },
    });
    session.title = newTitle;
  }

  // Save assistant message
  const assistantMessage = await db.chatMessage.create({
    data: {
      userId: auth.userId!,
      sessionId: session.id,
      role: "ASSISTANT",
      content: assistantReply,
    },
  });

  // Update session updatedAt to trigger reordering
  await db.chatSession.update({
    where: { id: session.id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ reply: assistantMessage, session });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const { sessionId, title } = await req.json();
    if (!sessionId || !title) {
      return NextResponse.json({ error: "Missing sessionId or title" }, { status: 400 });
    }

    const updated = await db.chatSession.update({
      where: { id: sessionId, userId: auth.userId! },
      data: { title: String(title).trim() },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH chat session error:", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const ids = sessionId.split(",");

    await db.chatSession.deleteMany({
      where: {
        id: { in: ids },
        userId: auth.userId!
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE chat session error:", error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
