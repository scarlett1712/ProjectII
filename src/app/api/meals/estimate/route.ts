import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api";

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if (auth.response) return auth.response;

  try {
    const { mealId, portionLabel, portionValue } = await req.json();
    if (!mealId || !portionLabel) {
      return NextResponse.json({ error: "Missing mealId or portionLabel" }, { status: 400 });
    }

    const meal = await db.mealEntry.findFirst({
      where: { id: mealId, userId: auth.userId! }
    });

    if (!meal) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    const prompt = `Bạn là một chuyên gia dinh dưỡng và trợ lý sức khỏe ảo đáng yêu tên là Star. 
Hãy ước tính lượng calories (kcal) cho món ăn sau:
Món ăn: "${meal.mealName}"
Khẩu phần ăn: "${portionLabel}" (Nhãn khẩu phần: ${portionValue})

Hãy trả về duy nhất một cấu trúc JSON hợp lệ như sau (không kèm markdown hay lời nói nào khác ngoài khối JSON):
{
  "calories": <số nguyên đại diện cho lượng calo ước lượng, ví dụ: 450>,
  "explanation": "<một câu giải thích siêu ngắn gọn, ngọt ngào bằng tiếng Việt bắt đầu bằng từ 'Bé Sao' hoặc 'Star' và kết thúc bằng một emoji phù hợp, tối đa 20 từ>"
}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY environment variable. Vui lòng cấu hình biến này trong Settings hoặc file .env nha!");
    }
    const url = "https://generativelanguage.googleapis.com/v1beta/openai/v1/chat/completions";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are a helpful nutrition assistant that always replies in valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
      }),
    });

    let estimatedCalories = 0;
    let explanation = "";

    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "";
      try {
        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          estimatedCalories = Number(parsed.calories) || 0;
          explanation = parsed.explanation || "";
        }
      } catch (e) {
        console.error("Failed to parse AI calorie estimation:", e);
      }
    }

    // Fallback estimation
    if (estimatedCalories <= 0) {
      const baseCal = 350;
      let multiplier = 1.0;
      if (portionValue === "small" || portionLabel.toLowerCase().includes("nhỏ") || portionLabel.toLowerCase().includes("ít")) {
        multiplier = 0.7;
      } else if (portionValue === "large" || portionLabel.toLowerCase().includes("lớn") || portionLabel.toLowerCase().includes("to") || portionLabel.toLowerCase().includes("nhiều")) {
        multiplier = 1.3;
      }
      estimatedCalories = Math.round(baseCal * multiplier);
      explanation = `Star ước lượng sơ bộ là khoảng ${estimatedCalories} kcal cho bạn iu nha! ✨`;
    }

    // Update meal in database
    const updatedMeal = await db.mealEntry.update({
      where: { id: mealId },
      data: {
        calories: estimatedCalories,
      }
    });

    return NextResponse.json({
      success: true,
      meal: updatedMeal,
      explanation
    });
  } catch (error) {
    console.error("Calorie estimation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
