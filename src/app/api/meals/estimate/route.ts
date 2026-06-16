import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api";

function estimateCaloriesHeuristically(mealName: string, portionLabel: string, portionValue: string): { calories: number; explanation: string } {
  const name = mealName.toLowerCase();
  const label = portionLabel.toLowerCase();
  
  let baseCal = 0;
  
  // 1. Carb Base
  if (name.includes("cơm") || name.includes("xôi")) {
    baseCal += 220;
  } else if (name.includes("phở") || name.includes("bún") || name.includes("mì") || name.includes("hủ tiếu") || name.includes("miến") || name.includes("bánh canh")) {
    baseCal += 300;
  } else if (name.includes("bánh mì") || name.includes("sandwich")) {
    baseCal += 250;
  } else if (name.includes("yến mạch") || name.includes("oatmeal")) {
    baseCal += 150;
  } else if (name.includes("khoai tây") || name.includes("khoai lang")) {
    baseCal += 120;
  } else if (name.includes("bánh bao")) {
    baseCal += 300;
  }
  
  // 2. Protein / Meat
  if (name.includes("thịt lợn") || name.includes("thịt heo") || name.includes("heo") || name.includes("lợn") || name.includes("sườn") || name.includes("ba chỉ")) {
    baseCal += 180;
  } else if (name.includes("thịt bò") || name.includes("bò")) {
    baseCal += 200;
  } else if (name.includes("gà") || name.includes("vịt") || name.includes("chim")) {
    baseCal += 150;
  } else if (name.includes("cá") || name.includes("tôm") || name.includes("mực") || name.includes("hải sản")) {
    baseCal += 120;
  } else if (name.includes("trứng")) {
    baseCal += 80;
  } else if (name.includes("đậu phụ") || name.includes("đậu hũ") || name.includes("đậu")) {
    baseCal += 80;
  }
  
  // 3. Preparation / Cooking Style (adds fats/oils)
  if (name.includes("xào") || name.includes("chiên") || name.includes("rán") || name.includes("quay") || name.includes("nướng")) {
    baseCal += 100;
  } else if (name.includes("sốt") || name.includes("kho") || name.includes("rim")) {
    baseCal += 70;
  } else if (name.includes("luộc") || name.includes("hấp") || name.includes("canh")) {
    baseCal += 20;
  }
  
  // 4. Veggies / Fruits / Others
  if (name.includes("su hào") || name.includes("su su") || name.includes("rau") || name.includes("cải") || name.includes("măng") || name.includes("nấm")) {
    baseCal += 40;
  }
  if (name.includes("sữa")) {
    baseCal += 120;
  }
  if (name.includes("nho khô") || name.includes("hạt") || name.includes("raisin")) {
    baseCal += 80;
  }
  if (name.includes("bơ") || name.includes("phô mai") || name.includes("cheese")) {
    baseCal += 100;
  }
  
  // If nothing matched, use a generic base
  if (baseCal === 0) {
    baseCal = 350;
  }
  
  // 5. Portion Multiplier
  let multiplier = 1.0;
  if (portionValue === "small" || label.includes("nhỏ") || label.includes("ít") || label.includes("1 bát cơm nhỏ") || label.includes("chén nhỏ")) {
    multiplier = 0.7;
  } else if (portionValue === "large" || label.includes("lớn") || label.includes("to") || label.includes("nhiều") || label.includes("gấp đôi")) {
    multiplier = 1.35;
  }
  
  const finalCal = Math.round(baseCal * multiplier);
  return {
    calories: finalCal,
    explanation: `Star ước lượng dựa trên thành phần thực phẩm là khoảng ${finalCal} kcal nha! ✨`
  };
}

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
    let res: Response | null = null;

    if (apiKey) {
      const url = "https://generativelanguage.googleapis.com/v1beta/openai/v1/chat/completions";
      const fallbackModels = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-3.1-flash-lite"];

      for (const model of fallbackModels) {
        try {
          const tempRes = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: "You are a helpful nutrition assistant that always replies in valid JSON." },
                { role: "user", content: prompt }
              ],
              temperature: 0.2,
            }),
          });
          if (tempRes.ok) {
            res = tempRes;
            break;
          }
          console.warn(`Direct Gemini calorie estimation with model ${model} failed (status ${tempRes.status}):`, await tempRes.text());
        } catch (err) {
          console.error(`Direct Gemini calorie estimation with model ${model} error:`, err);
        }
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
            { role: "system", content: "You are a helpful nutrition assistant that always replies in valid JSON." },
            { role: "user", content: prompt }
          ],
          temperature: 0.2,
        }),
      });
    }

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

    // Fallback estimation using smart heuristic if AI call fails or returns <= 0
    if (estimatedCalories <= 0) {
      const fallback = estimateCaloriesHeuristically(meal.mealName, portionLabel, portionValue);
      estimatedCalories = fallback.calories;
      explanation = fallback.explanation;
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
