/** Account rules shared by server schemas and client form validation. */
export const PASSWORD_MIN_LENGTH = 8;
/** Password-reset codes contain six digits. */
export const OTP_LENGTH = 6;
/** Each email address must wait 60 seconds before requesting another code. */
export const OTP_RESEND_COOLDOWN_SEC = 60;
