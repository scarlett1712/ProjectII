import { WEATHER_CITY_COORDS, type StarPersonality, type WeatherCity } from "@/shared/domain/settings";

export type PetMood = "idle" | "walking" | "singing" | "dragging" | "pouting" | "celebrating" | "sleepy";

const PICK = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

export function getGreetingByHour(personality: StarPersonality, hour: number): string {
  const isNight = hour >= 23 || hour < 5;
  const period = hour < 11 ? "morning" : hour < 14 ? "noon" : hour < 18 ? "afternoon" : "evening";

  const map: Record<StarPersonality, Record<"morning" | "noon" | "afternoon" | "evening" | "night", string>> = {
    cute: {
      morning: "Chào buổi sáng tốt lành nha! Bé Sao chúc bạn ngày mới thật rực rỡ ✨",
      noon: "Trưa rồi nè, nhớ ăn uống đầy đủ và nghỉ ngơi chút nha~ 🍱",
      afternoon: "Chiều rồi đó, cố lên nào, Bé Sao luôn ở bên cổ vũ bạn! 🌟",
      evening: "Chào buổi tối! Hôm nay của bạn thế nào rồi, kể cho Bé Sao nghe đi~ 🌙",
      night: "Khuya rồi đó nha, ngủ sớm giữ gìn sức khỏe nhé bạn ơi 💤",
    },
    cool: {
      morning: "Chào buổi sáng. Sẵn sàng cho hôm nay chưa?",
      noon: "Đến trưa rồi. Nạp năng lượng đi.",
      afternoon: "Buổi chiều. Giữ vững nhịp độ nhé.",
      evening: "Tối rồi. Tổng kết ngày hôm nay thôi.",
      night: "Đã khuya. Nghỉ ngơi đi, mai làm tiếp.",
    },
    tsundere: {
      morning: "Ờm... chào buổi sáng! Đừng hiểu lầm, tui chỉ tiện đường chào thôi đấy!",
      noon: "Trưa rồi mà chưa ăn là tui giận thật đấy nhé!",
      afternoon: "Chiều rồi, làm việc cho đàng hoàng vào, tui không thèm lo cho bạn đâu hứ!",
      evening: "Tối rồi đó... hôm nay có mệt lắm không đấy?",
      night: "Khuya thế này còn thức làm gì?! Đi ngủ ngay đi đồ ngốc!",
    },
    energetic: {
      morning: "DẬY NÀOOOO! Một ngày siêu đỉnh đang chờ tụi mình đó!! 🚀🔥",
      noon: "Ting ting! Giờ cơm tới rồi, nạp pin thôi bạn ơi!! ⚡",
      afternoon: "Chiều năng suất x100 nào! Let's goooo! 🎉",
      evening: "Wooo tối rồi! Hôm nay bạn làm quá đỉnh luôn á! 🌟",
      night: "Oái, khuya rồi mà mắt vẫn sáng rực thế! Đi ngủ nạp pin mai quẩy tiếp nha 😴",
    },
    zen: {
      morning: "Chào buổi sáng. Hít một hơi thật sâu và bắt đầu ngày mới an nhiên nhé.",
      noon: "Giữa trưa tĩnh lặng, hãy dành vài phút thư giãn cho tâm trí.",
      afternoon: "Buổi chiều trôi chậm, từng bước nhỏ rồi cũng tới đích.",
      evening: "Màn đêm buông xuống, hãy gác lại âu lo và mỉm cười với hôm nay.",
      night: "Đêm đã khuya, vạn vật đều nghỉ ngơi, bạn cũng thế nhé.",
    },
  };

  return isNight ? map[personality].night : map[personality][period];
}

export function getDragLine(personality: StarPersonality): string {
  const lines: Record<StarPersonality, readonly string[]> = {
    cute: ["Á! Thả tui raaa! 😖", "Ui da, đừng túm cổ áo tui mà~ 🥺", "Chóng mặt quá đi mất! 😵"],
    cool: ["Đừng chạm vào tôi.", "Thả ra. Tôi tự đi được.", "Hành động này không ngầu chút nào."],
    tsundere: ["B-bỏ ra ngay!! Ai cho phép túm tui thế hả?! 😤", "Hứ! Kéo nữa là tui dỗi cả tuần đấy!", "Đừng có lắc tui như thế đồ đáng ghét!"],
    energetic: ["Weee! Đang bay nè!! 🎢", "Nữa đi nữa đi, vui quá trời! 😆", "Á há há, nhột quáaa!"],
    zen: ["Mọi sự níu giữ đều là vô thường...", "Hãy đặt tôi xuống nhẹ nhàng như làn gió.", "Tôi đang thiền mà bạn ơi..."],
  };
  return PICK(lines[personality]);
}

export function getSingLine(personality: StarPersonality): string {
  const lines: Record<StarPersonality, readonly string[]> = {
    cute: ["♪ Là lá la~ Hôm nay thật vui ♪", "♫ Ngôi sao nhỏ lấp lánh trên trời cao ♫", "♪ Uống miếng nước cho tươi tỉnh nào ♪"],
    cool: ["♪ Hmm... ♪", "♫ (Đang nghe nhạc lo-fi) ♫", "♪ Giai điệu khá ổn đấy. ♪"],
    tsundere: ["♪ Hừm... tui chỉ ngân nga chút thôi, nhìn gì mà nhìn! ♪", "♫ Lá la... không phải hát cho bạn nghe đâu! ♫"],
    energetic: ["♪ ĐỒ RÊ MI PHA SON LA SI ĐỐ! 🎶", "♫ Nhảy theo nhịp nào bạn ơiiii! 💃✨", "♪ Boom chaka laka~ ♪"],
    zen: ["♪ Tiếng gió thổi qua hiên nhà... ♪", "♫ Hòa mình vào nhịp điệu yên bình ♫"],
  };
  return PICK(lines[personality]);
}

export function getPokeLine(personality: StarPersonality): string {
  const lines: Record<StarPersonality, readonly string[]> = {
    cute: ["Hihi, chọt tui hoài vậy? ✨", "Cần Bé Sao giúp gì hông nè? 💛", "Chúc bạn một ngày siêu may mắn nha! 🍀"],
    cool: ["Có chuyện gì?", "Tôi vẫn đang quan sát đấy.", "Tập trung làm việc đi."],
    tsundere: ["Gì nữa đây?! Đừng có chọt má tui hoài! 😳", "Hứ... rảnh rỗi quá ha!"],
    energetic: ["High-five nào! ✋✨", "Bắt được tui rồi hả? Hahaha! 😄", "Năng lượng tràn đầy!! ⚡"],
    zen: ["Tĩnh tâm nào, bạn đang tìm điều gì?", "Một cái chạm nhẹ cũng là duyên lành."],
  };
  return PICK(lines[personality]);
}

export function getCelebrateLine(personality: StarPersonality): string {
  const lines: Record<StarPersonality, readonly string[]> = {
    cute: ["Hoan hô! Bạn giỏi quá đi mất!! 🎉✨", "Xuất sắc luôn, tặng bạn ngàn sao nè! ⭐"],
    cool: ["Làm tốt lắm.", "Đạt mục tiêu. Tiếp tục phát huy."],
    tsundere: ["Ờ thì... cũng tạm được đấy! (Giỏi lắm!) 👏", "Hứ, đừng có tự mãn quá nha, nhưng mà... chúc mừng!"],
    energetic: ["ĐỈNH CỦA CHÓP!! 🥳🔥🎉", "QUÁ ĐÃ LUÔN BẠN ƠIIII!! 🚀"],
    zen: ["Thành quả ngọt ngào từ sự kiên trì của bạn.", "Thật đáng trân trọng."],
  };
  return PICK(lines[personality]);
}

export interface BriefingItem {
  title: string;
  tagName?: string | null;
}

export function formatBriefingMessage(
  personality: StarPersonality,
  hour: number,
  weatherText: string | null,
  tasks: BriefingItem[],
  events: BriefingItem[],
): string {
  const greet = getGreetingByHour(personality, hour);
  const weatherPart = weatherText ? ` 🌤️ ${weatherText}.` : "";
  const allItems = [...events, ...tasks];
  if (allItems.length === 0) {
    const emptyText = personality === "cool" ? " Hôm nay lịch trống." : " Hôm nay chưa có lịch trình hay việc cần làm nào.";
    return `${greet}${weatherPart}${emptyText}`;
  }
  const preview = allItems
    .slice(0, 4)
    .map((item) => (item.tagName ? `${item.title} [${item.tagName}]` : item.title))
    .join(", ");
  const more = allItems.length > 4 ? ` (+${allItems.length - 4})` : "";
  return `${greet}${weatherPart} Hôm nay có ${events.length} lịch trình & ${tasks.length} việc cần làm: ${preview}${more}.`;
}

function describeWmoCode(code: number): string {
  if (code === 0) return "Trời quang đãng";
  if (code <= 3) return "Trời có mây nhẹ";
  if (code <= 48) return "Có sương mù";
  if (code <= 67) return "Có mưa";
  if (code <= 77) return "Trời lạnh";
  if (code <= 82) return "Có mưa rào";
  return "Có dông bão";
}

async function resolveCoords(city: WeatherCity): Promise<{ lat: number; lon: number }> {
  if (city !== "auto") return WEATHER_CITY_COORDS[city];
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000, maximumAge: 600_000 });
      });
      return { lat: pos.coords.latitude, lon: pos.coords.longitude };
    } catch {
      // Fallback to Hanoi when permission is denied or unavailable
    }
  }
  return WEATHER_CITY_COORDS.hanoi;
}

export async function fetchWeatherSummary(city: WeatherCity): Promise<string | null> {
  try {
    const { lat, lon } = await resolveCoords(city);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { current?: { temperature_2m?: number; weather_code?: number } };
    const temp = data.current?.temperature_2m;
    const code = data.current?.weather_code;
    if (typeof temp !== "number") return null;
    const desc = typeof code === "number" ? describeWmoCode(code) : "Thời tiết ổn định";
    return `${desc}, ${Math.round(temp)}°C`;
  } catch {
    return null;
  }
}

let sharedAudioCtx: AudioContext | null = null;

/**
 * Play a soft, non-intrusive chime on desktop.
 * On mobile touch devices, use a light haptic pulse instead of Web Audio so the browser
 * never hijacks OS audio focus or accidentally resumes another app's music player.
 */
export function playStarChime() {
  if (typeof window === "undefined") return;
  try {
    if (window.matchMedia?.("(pointer: coarse)").matches) {
      navigator.vibrate?.(15);
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === "suspended") {
      void sharedAudioCtx.resume();
    }
    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, sharedAudioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, sharedAudioCtx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.04, sharedAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, sharedAudioCtx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(sharedAudioCtx.destination);
    osc.start();
    osc.stop(sharedAudioCtx.currentTime + 0.22);
  } catch {
    // Ignore audio policy errors
  }
}
