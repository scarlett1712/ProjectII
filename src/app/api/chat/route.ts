import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/api";
import { parseIntent } from "@/lib/chat/intentParser";
import { executeIntent } from "@/lib/chat/actionExecutor";

function buildGuestReply(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("quen") || lower.includes("mật khẩu") || lower.includes("mat khau")) {
    return "Nếu quên mật khẩu, bạn hãy kiểm tra xem app đã có chức năng đặt lại mật khẩu chưa. Trước mắt, bạn có thể thử lại email đăng ký đúng và nhập mật khẩu cẩn thận (phân biệt chữ hoa/thường).";
  }
  if (lower.includes("dang ky") || lower.includes("đăng ký") || lower.includes("register")) {
    return "Bạn bấm 'Đăng ký' bên dưới form đăng nhập, điền email + mật khẩu rồi quay lại đăng nhập nhé.";
  }
  if (lower.includes("email")) {
    return "Hãy dùng đúng email bạn đã đăng ký. Nếu gõ có dấu cách đầu/cuối, bạn xóa giúp mình rồi thử lại.";
  }
  return "Mình đang ở chế độ khách nên chỉ hướng dẫn đăng nhập thôi nha. Bạn nhập email + mật khẩu rồi bấm 'Đăng nhập'. Sau khi vào hệ thống, mình sẽ hỗ trợ đầy đủ các chức năng.";
}

export async function GET() {
  const auth = await requireUserId();
  if (auth.response) return auth.response;
  const session = await db.chatSession.findFirst({
    where: { userId: auth.userId! },
    orderBy: { updatedAt: "desc" },
  });
  if (!session) return NextResponse.json({ session: null, messages: [] });
  const messages = await db.chatMessage.findMany({
    where: { sessionId: session.id, userId: auth.userId! },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ session, messages });
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  const body = await req.json();

  if (body.reset) {
    if (auth.response) {
      return NextResponse.json({ session: null, messages: [] });
    }
    const session = await db.chatSession.create({
      data: { userId: auth.userId!, title: "Tro ly suc khoe" },
    });
    return NextResponse.json({ session, messages: [] });
  }

  const content = String(body.content ?? "");
  if (!content.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
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

  const session =
    (await db.chatSession.findFirst({
      where: { userId: auth.userId! },
      orderBy: { updatedAt: "desc" },
    })) ??
    (await db.chatSession.create({
      data: { userId: auth.userId!, title: "Tro ly suc khoe" },
    }));

  await db.chatMessage.create({
    data: {
      userId: auth.userId!,
      sessionId: session.id,
      role: "USER",
      content,
    },
  });

  const intent = parseIntent(content);
  const assistantReply = await executeIntent({
    userId: auth.userId!,
    sessionId: session.id,
    intent,
  });

  const assistantMessage = await db.chatMessage.create({
    data: {
      userId: auth.userId!,
      sessionId: session.id,
      role: "ASSISTANT",
      content: assistantReply,
    },
  });

  return NextResponse.json({ reply: assistantMessage });
}
