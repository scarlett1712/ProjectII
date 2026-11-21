/** Predefined guest reply selected by keywords in the message. */
export function buildGuestReply(message: string) {
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
