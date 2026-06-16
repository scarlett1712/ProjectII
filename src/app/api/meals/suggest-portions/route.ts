import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api";

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const { mealName } = await req.json();
    if (!mealName) {
      return NextResponse.json({ error: "Missing mealName" }, { status: 400 });
    }

    const prompt = `Bạn là một trợ lý dinh dưỡng ảo tên là Star. 
Hãy gợi ý 3 phương án khẩu phần ăn (đơn vị đo đạc) phù hợp nhất và mang tính thực tế cao cho món ăn sau: "${mealName}".

Quy tắc thiết kế khẩu phần ăn:
1. Đừng sử dụng các mô tả chung chung hoặc chỉ ghi tổng khối lượng ước tính kiểu "Khẩu phần nhỏ (350g)" hay "350g". Hãy phân tích chi tiết món ăn.
2. Nếu món ăn gồm nhiều thành phần (ví dụ có chứa các từ như "+", "và", "kèm", hoặc dấu phẩy), bạn phải bóc tách và đề xuất cụ thể cho từng thành phần tại mỗi mức độ khẩu phần:
   - Cơm/Bún/Phở: dùng các đơn vị quen thuộc như "bát cơm nhỏ/vừa/to", "chén cơm", "bát bún/phở".
   - Các món thịt/cá/protein: mô tả bằng số lượng lát, miếng, hoặc định lượng gam cụ thể (ví dụ: "80g thịt bò", "120g thịt kho", "1 quả trứng ốp la").
   - Các món rau/phụ: mô tả bằng "đĩa nhỏ/vừa/to", "chén rau".
   Ví dụ với món "Cơm + bò kho + su su luộc":
   - "small": "1 bát cơm nhỏ + 80g bò kho + 1 đĩa su su nhỏ"
   - "medium": "1 bát cơm vừa + 120g bò kho + 1 đĩa su su vừa"
   - "large": "1 bát cơm to + 180g bò kho + 1 đĩa su su to"
3. Nếu món ăn là một món đơn lẻ:
   - Cơm rang/Mì xào/Phở/Bún: sử dụng "Bát nhỏ/vừa/to" hoặc "Đĩa nhỏ/vừa/to" (có thể kèm mô tả lượng thịt/topping nếu có).
   - Pizza/Bánh ngọt: sử dụng "1 lát", "2 lát", "nửa cái", "1 cái".
   - Trái cây: sử dụng "1 quả nhỏ", "1 quả vừa", "1 quả to" hoặc số lượng miếng.
   - Nước uống: sử dụng "Ly nhỏ 200ml", "Ly vừa 350ml", "Ly lớn 500ml" hoặc "Chai/Hộp".
4. Giữ cho các nhãn khẩu phần (label) ngắn gọn và súc tích (dưới 65 ký tự) để hiển thị vừa vặn trên các nút bấm giao diện.

Hãy trả về duy nhất một mảng JSON hợp lệ chứa đúng 3 phần tử như sau (không kèm markdown hay bất kỳ lời dẫn giải nào ngoài khối JSON):
[
  { "label": "<tên khẩu phần cho mức nhỏ, ví dụ: 1 bát cơm nhỏ + 80g bò kho + 1 đĩa su su nhỏ>", "value": "small" },
  { "label": "<tên khẩu phần cho mức vừa, ví dụ: 1 bát cơm vừa + 120g bò kho + 1 đĩa su su vừa>", "value": "medium" },
  { "label": "<tên khẩu phần cho mức lớn, ví dụ: 1 bát cơm to + 180g bò kho + 1 đĩa su su to>", "value": "large" }
]`;

    const apiKey = process.env.GEMINI_API_KEY;
    let res: Response | null = null;

    if (apiKey) {
      const url = "https://generativelanguage.googleapis.com/v1beta/openai/v1/chat/completions";
      try {
        res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "You are a helpful nutrition assistant that always replies in valid JSON arrays." },
              { role: "user", content: prompt }
            ],
            temperature: 0.2,
          }),
        });
        if (!res.ok) {
          console.error("Direct Gemini portion suggestion failed, falling back to OpenClaw Gateway:", await res.text());
          res = null;
        }
      } catch (err) {
        console.error("Direct Gemini portion suggestion error, falling back to OpenClaw Gateway:", err);
        res = null;
      }
    }

    if (!res) {
      const url = `${process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:18789"}/v1/chat/completions`;
      const token = process.env.OPENCLAW_TOKEN;

      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          model: "openclaw",
          messages: [
            { role: "system", content: "You are a helpful nutrition assistant that always replies in valid JSON arrays." },
            { role: "user", content: prompt }
          ],
          temperature: 0.2,
        }),
      });
    }

    let portions = [
      { label: "Khẩu phần nhỏ", value: "small" },
      { label: "Khẩu phần vừa", value: "medium" },
      { label: "Khẩu phần lớn", value: "large" },
    ];

    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "";
      try {
        const jsonMatch = text.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length === 3) {
            portions = parsed;
          }
        }
      } catch (e) {
        console.error("Failed to parse AI portion suggestion:", e);
      }
    }

    return NextResponse.json({ portions });
  } catch (error) {
    console.error("Suggest portions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
