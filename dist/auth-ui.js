import { supabaseConfig } from "./supabase-config.js";
import { validConfig, authError } from "./auth-config.js";

export async function initAccount({ onUser, onClient, onReady }) {
  const $ = (id) => document.getElementById(id);
  let client = null,
    view = "login",
    busy = false,
    recovery = false,
    userId = null;
  const ready = validConfig(supabaseConfig);
  const labels = {
    login: "เข้าสู่ระบบ",
    register: "สมัครสมาชิก",
    forgot: "ขอลิงก์ตั้งรหัสผ่านใหม่",
    reset: "ตั้งรหัสผ่านใหม่",
  };
  const message = (text, error = false) => {
    $("auth-message").textContent = text;
    $("auth-message").classList.toggle("error", error);
  };
  function setBusy(value) {
    busy = value;
    $("auth-form")
      .querySelectorAll("input,button")
      .forEach((el) => {
        el.disabled = value || !client;
      });
    $("auth-submit").textContent = value ? "กำลังดำเนินการ…" : labels[view];
  }
  function setView(next) {
    view = next;
    $("auth-title").textContent = labels[view];
    $("auth-form").reset();
    $("auth-name-field").hidden = view !== "register";
    $("auth-name").required = view === "register";
    $("auth-email-field").hidden = view === "reset";
    $("auth-email").required = view !== "reset";
    $("auth-password-field").hidden = view === "forgot";
    $("auth-password").required = view !== "forgot";
    $("auth-password").minLength = view === "login" ? 1 : 8;
    $("auth-password").autocomplete =
      view === "login" ? "current-password" : "new-password";
    $("auth-confirm-field").hidden = !["register", "reset"].includes(view);
    $("auth-confirm").required = ["register", "reset"].includes(view);
    $("auth-switch").hidden = view === "reset";
    $("auth-switch").textContent =
      view === "login"
        ? "ยังไม่มีบัญชี? สมัครสมาชิก"
        : "มีบัญชีแล้ว? เข้าสู่ระบบ";
    $("auth-forgot").hidden = view !== "login";
    $("auth-resend").hidden = view !== "login";
    message(
      ready ? "" : "ระบบบัญชียังไม่เปิดให้ใช้งาน เล่นแบบผู้เยี่ยมชมได้ตามปกติ",
    );
    setBusy(busy);
  }
  $("account-login").onclick = () => {
    setView(recovery ? "reset" : "login");
    $("auth-dialog").showModal();
  };
  $("auth-close").onclick = () => {
    $("auth-dialog").close();
    $("auth-form").reset();
  };
  $("auth-dialog").addEventListener("close", () => $("auth-form").reset());
  $("auth-switch").onclick = () =>
    setView(view === "login" ? "register" : "login");
  $("auth-forgot").onclick = () => setView("forgot");
  const redirectTo = `${location.origin}${location.pathname}`;
  $("auth-form").onsubmit = async (e) => {
    e.preventDefault();
    if (!client || busy) return;
    const email = $("auth-email").value.trim(),
      password = $("auth-password").value;
    if (
      ["register", "reset"].includes(view) &&
      password !== $("auth-confirm").value
    ) {
      message("รหัสผ่านทั้งสองช่องไม่ตรงกัน", true);
      return;
    }
    const action = view;
    setBusy(true);
    message("");
    try {
      let result;
      if (action === "register")
        result = await client.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: $("auth-name").value.trim() },
            emailRedirectTo: redirectTo,
          },
        });
      else if (action === "forgot")
        result = await client.auth.resetPasswordForEmail(email, { redirectTo });
      else if (action === "reset")
        result = await client.auth.updateUser({ password });
      else result = await client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      $("auth-password").value = "";
      $("auth-confirm").value = "";
      if (action === "register" && !result.data.session)
        message(
          "ตรวจอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ หากเคยสมัครแล้วให้ลองเข้าสู่ระบบ",
        );
      else if (action === "forgot")
        message(
          "หากอีเมลนี้มีบัญชี คุณจะได้รับลิงก์ตั้งรหัสผ่านใหม่ กรุณาตรวจกล่องจดหมายและสแปม",
        );
      else if (action === "reset") {
        recovery = false;
        message("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
        $("auth-switch").hidden = false;
      } else $("auth-dialog").close();
    } catch (error) {
      message(authError(error), true);
    } finally {
      setBusy(false);
    }
  };
  $("auth-resend").onclick = async () => {
    if (!client || busy || !$("auth-email").reportValidity()) return;
    setBusy(true);
    try {
      const { error } = await client.auth.resend({
        type: "signup",
        email: $("auth-email").value.trim(),
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      message("หากบัญชียังรอยืนยัน คุณจะได้รับลิงก์ทางอีเมล");
    } catch (error) {
      message(authError(error), true);
    } finally {
      setBusy(false);
    }
  };
  $("account-logout").onclick = async () => {
    if (!client || busy) return;
    $("account-logout").disabled = true;
    try {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw error;
    } catch {
      $("account-status").textContent = "ออกจากระบบไม่สำเร็จ กรุณาลองใหม่";
    } finally {
      $("account-logout").disabled = false;
    }
  };
  if (!ready) {
    setView("login");
    onReady();
    return;
  }
  $("account-login").disabled = true;
  try {
    const { createClient } = await import("./vendor/supabase.js");
    client = createClient(supabaseConfig.url, supabaseConfig.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "implicit",
      },
    });
    onClient(client);
    client.auth.onAuthStateChange((event, session) => {
      // No awaited SDK/database calls inside the SDK's auth-state lock.
      setTimeout(() => {
        const user = session?.user || null;
        const changed = userId !== (user?.id || null);
        userId = user?.id || null;
        $("account-login").hidden =
          !!user && !recovery && event !== "PASSWORD_RECOVERY";
        $("account-logout").hidden = !user;
        $("account-status").textContent = user
          ? user.user_metadata?.display_name || user.email || "นักบิน"
          : "ผู้เยี่ยมชม · ประวัติอยู่ในเครื่องนี้";
        if (changed || event === "INITIAL_SESSION") onUser(user);
        $("account-login").disabled = false;
        onReady();
        if (event === "PASSWORD_RECOVERY") {
          recovery = true;
          setView("reset");
          $("auth-dialog").showModal();
        }
      }, 0);
    });
    const params = new URLSearchParams(location.hash.slice(1));
    if (params.has("error") || params.has("error_description")) {
      window.history.replaceState(null, "", redirectTo);
      setView("forgot");
      message("ลิงก์ยืนยันหมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่", true);
      $("auth-dialog").showModal();
    }
  } catch {
    $("account-status").textContent =
      "โหลดระบบบัญชีไม่สำเร็จ รีเฟรชหน้าเพื่อลองใหม่";
    $("account-login").disabled = false;
    onReady();
    message("ระบบบัญชีไม่พร้อมใช้งาน กรุณารีเฟรชหน้าแล้วลองใหม่", true);
  }
}
