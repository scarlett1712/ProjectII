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
Hãy gợi ý 3 phương án khẩu phần ăn (đơn vị đo đạc) phù hợp nhất với món ăn sau: "${mealName}".
Đơn vị khẩu phần cần linh hoạt và thực tế phù hợp với món ăn đó, ví dụ:
- Phở/Bún: "Bát nhỏ", "Bát vừa", "Bát to"
- Pizza: "1 lát nhỏ", "Nửa cái", "1 cái nguyên"
- Sữa/Nước ngọt: "Hộp nhỏ 180ml", "Hộp vừa 250ml", "Hộp lớn 330ml"
- Trái cây: "1 quả nhỏ", "1 quả vừa", "1 quả lớn" hoặc theo miếng.

Hãy trả về duy nhất một mảng JSON hợp lệ chứa đúng 3 phần tử như sau (không kèm markdown hay lời nói nào khác ngoài khối JSON):
[
  { "label": "<tên khẩu phần tiếng Việt, ví dụ: Bát nhỏ (300g)>", "value": "small" },
  { "label": "<tên khẩu phần tiếng Việt, ví dụ: Bát vừa (400g)>", "value": "medium" },
  { "label": "<tên khẩu phần tiếng Việt, ví dụ: Bát lớn (500g)>", "value": "large" }
]`;

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
        messages: [
          { role: "system", content: "You are a helpful nutrition assistant that always replies in valid JSON arrays." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
      }),
    });

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
