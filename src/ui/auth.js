// ==========================================
// 🔐 صفحه ورود به داشبورد
// ==========================================

export function renderLoginPage(errorMsg = "") {
  const errorHtml = errorMsg
    ? `<p style="color:#dc3545;text-align:center;margin-top:10px;">${errorMsg}</p>`
    : "";

  return `<!DOCTYPE html>
<html dir="rtl" lang="fa"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ورود به پنل مدیریت</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Tahoma,Arial,sans-serif;background:linear-gradient(135deg,#1a1a2e,#16213e);display:flex;justify-content:center;align-items:center;min-height:100vh;color:#fff}
.card{background:rgba(255,255,255,.05);backdrop-filter:blur(10px);padding:2.5rem;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);text-align:center;width:100%;max-width:380px}
h2{margin-bottom:1.5rem;font-size:1.3rem}
input{width:100%;padding:12px 16px;margin:8px 0;border:1px solid rgba(255,255,255,.2);border-radius:8px;background:rgba(255,255,255,.1);color:#fff;font-size:1rem;outline:none}
input::placeholder{color:rgba(255,255,255,.5)}
input:focus{border-color:#4dabf7}
button{width:100%;padding:12px;margin-top:12px;background:#4dabf7;color:#fff;border:none;border-radius:8px;font-size:1rem;cursor:pointer}
button:hover{background:#339af0}
</style></head><body>
<div class="card">
<h2>🔐 ورود به داشبورد مدیریت</h2>
<form method="POST" action="/admin">
<input type="password" name="password" placeholder="رمز عبور" required autofocus>
<button type="submit">ورود</button>
</form>
${errorHtml}
</div></body></html>`;
}
