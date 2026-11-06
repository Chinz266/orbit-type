export function validConfig(config) {
  try {
    const url = new URL(config.url);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !/^\/?$/.test(url.pathname)
    )
      return false;
    if (config.publishableKey?.startsWith("sb_publishable_")) return true;
    // Support legacy public anon keys, but never a service_role JWT.
    const claims = JSON.parse(
      atob(
        config.publishableKey
          .split(".")[1]
          .replace(/-/g, "+")
          .replace(/_/g, "/"),
      ),
    );
    return claims.role === "anon";
  } catch {
    return false;
  }
}

export function authError(error) {
  const messages = {
    invalid_credentials: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    email_not_confirmed:
      "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ ตรวจกล่องจดหมายหรือส่งลิงก์ยืนยันอีกครั้ง",
    user_already_exists: "อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบหรือกู้รหัสผ่าน",
    weak_password:
      "รหัสผ่านไม่ผ่านข้อกำหนด กรุณาใช้รหัสผ่านที่ยาวและคาดเดายากขึ้น",
    same_password: "กรุณาใช้รหัสผ่านใหม่ที่ต่างจากเดิม",
    over_email_send_rate_limit: "ส่งอีเมลบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
    over_request_rate_limit: "ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
    otp_expired: "ลิงก์หมดอายุหรือถูกใช้แล้ว กรุณาขอลิงก์ใหม่",
    signup_disabled: "ยังไม่เปิดรับสมัครสมาชิกในขณะนี้",
    email_address_not_authorized:
      "ยังส่งอีเมลไปยังที่อยู่นี้ไม่ได้ ผู้ดูแลต้องเปิดบริการส่งอีเมลก่อน",
  };
  return (
    messages[error?.code] ||
    "ทำรายการไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่"
  );
}
