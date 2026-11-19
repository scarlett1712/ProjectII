import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api";
import { sendPushToUser } from "@/lib/webpush";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUserId(req);
    if (auth.response) return auth.response;
    const userId = auth.userId;

    const body = await req.json().catch(() => ({}));
    const result = await sendPushToUser(userId, {
      title: body.title || "Little Star Test Push ⭐",
      body: body.message || "Thông báo thử nghiệm Web Push hoạt động tuyệt vời! 🎉",
      data: { url: "/dashboard" },
    });

    if (result.total === 0) {
      return NextResponse.json({
        success: false,
        error: "Chưa có thiết bị nào đăng ký nhận thông báo trong cơ sở dữ liệu. Vui lòng bấm 'Bật thông báo' trên thiết bị này rồi thử lại nhé!",
      }, { status: 400 });
    }

    if (result.sent === 0) {
      return NextResponse.json({
        success: false,
        error: `Đã tìm thấy ${result.total} đăng ký nhưng gửi thông báo thất bại (có thể đã hết hạn hoặc bị từ chối bởi dịch vụ push).`,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Đã gửi thông báo thành công tới ${result.sent}/${result.total} thiết bị!`,
      sent: result.sent,
      total: result.total,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
