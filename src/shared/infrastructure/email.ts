import nodemailer from "nodemailer";

interface SendOtpEmailParams {
  to: string;
  otp: string;
  name?: string | null;
  /** Code lifetime displayed in the email. */
  ttlMinutes: number;
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

/**
 * Send the OTP via SMTP. During development with no SMTP configuration, log the code for local testing.
 * In production, missing SMTP settings and delivery failures throw errors. Never log the code.
 */
export async function sendOtpEmail({ to, otp, name, ttlMinutes }: SendOtpEmailParams) {
  const isProduction = process.env.NODE_ENV === "production";
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT) || 465;
  const fromEmail = process.env.SMTP_FROM || `"Little Star" <${smtpUser || "support@littlestar.app"}>`;

  // If SMTP credentials are configured, send real email
  if (smtpUser && smtpPass) {
    try {
      const cleanPass = smtpPass.replace(/\s+/g, "");
      const transporter = nodemailer.createTransport(
        smtpHost.includes("gmail")
          ? {
              service: "gmail",
              auth: {
                user: smtpUser.trim(),
                pass: cleanPass,
              },
            }
          : {
              host: smtpHost,
              port: smtpPort,
              secure: smtpPort === 465,
              auth: {
                user: smtpUser.trim(),
                pass: cleanPass,
              },
            }
      );

      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border-radius: 20px; background: #ffffff; border: 1px solid #f3e8ff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 28px; background: #f5f3ff; font-size: 28px;">⭐</div>
            <h2 style="color: #7c3aed; margin-top: 12px; margin-bottom: 4px; font-size: 24px; font-weight: 800;">Little Star</h2>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">Mã xác thực đặt lại mật khẩu</p>
          </div>

          <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <p style="color: #4b5563; font-size: 14px; margin-top: 0; margin-bottom: 12px;">
              Xin chào <strong>${escapeHtml(name || to)}</strong>, bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản Little Star. Đây là mã xác thực (OTP) của bạn:
            </p>
            <div style="display: inline-block; letter-spacing: 8px; font-size: 32px; font-weight: 800; color: #6d28d9; padding: 12px 24px; background: #ffffff; border-radius: 12px; border: 2px dashed #c4b5fd;">
              ${otp}
            </div>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 12px; margin-bottom: 0;">
              Mã xác thực có hiệu lực trong vòng <strong>${ttlMinutes} phút</strong>.
            </p>
          </div>

          <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin-bottom: 16px;">
            Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email. Tài khoản của bạn vẫn được bảo mật an toàn.
          </p>

          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
          <p style="text-align: center; color: #9ca3af; font-size: 11px; margin: 0;">
            © ${new Date().getFullYear()} Little Star Assistant. Thân gửi từ Bé Sao ⭐
          </p>
        </div>
      `;

      await transporter.sendMail({
        from: fromEmail,
        to,
        subject: `[Little Star] ${otp} là mã xác thực đặt lại mật khẩu của bạn`,
        html: htmlContent,
      });

      return { success: true, simulated: false };
    } catch (err) {
      console.error("Lỗi khi gửi email qua SMTP:", err);
      if (isProduction) throw err;
      // Fall back to simulated delivery during development so local testing can continue.
    }
  } else if (isProduction) {
    throw new Error("SMTP chưa được cấu hình (SMTP_USER/SMTP_PASS).");
  }

  // Simulate delivery during development by printing the code to the console.
  console.info(`[EMAIL giả lập] OTP gửi tới ${to}: ${otp} (hiệu lực ${ttlMinutes} phút)`);

  return { success: true, simulated: true, otp };
}
