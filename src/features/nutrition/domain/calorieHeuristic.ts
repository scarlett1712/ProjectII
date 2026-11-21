export interface CalorieEstimate {
  calories: number;
  explanation: string;
}

/** Fallback calorie estimate based on food keywords and portion size when AI fails or returns a nonpositive value. */
export function estimateCaloriesHeuristically(
  mealName: string,
  portionLabel: string,
  portionValue: string | null | undefined,
): CalorieEstimate {
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
    explanation: `Star ước lượng dựa trên thành phần thực phẩm là khoảng ${finalCal} kcal nha! ✨`,
  };
}
