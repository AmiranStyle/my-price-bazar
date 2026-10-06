// ==========================================
// 🔐 صفحه ورود امن و زیبای داشبورد
// ==========================================

export function renderLoginPage(errorMsg = "") {
  return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ورود به پنل مدیریت | Price Bazar</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Vazirmatn, Tahoma, sans-serif; }
    body {
      background: radial-gradient(circle at 20% 20%, #1e1e38 0%, #0d0e15 100%);
      color: #f1f5f9;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 1rem;
    }
    .login-card {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 2.5rem 2rem;
      border-radius: 20px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-radius: 18px;
      font-size: 2rem;
      margin-bottom: 1.2rem;
      box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
    }
    h2 { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem; color: #fff; }
    p.desc { font-size: 0.85rem; color: #94a3b8; margin-bottom: 2rem; }
    .input-wrap { margin-bottom: 1.5rem; text-align: right; }
    .input-wrap label { display: block; font-size: 0.8rem; color: #cbd5e1; margin-bottom: 6px; }
    input[type="password"] {
      width: 100%;
      padding: 12px 16px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      color: #fff;
      font-size: 1rem;
      outline: none;
      transition: all 0.2s ease;
    }
    input[type="password"]:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
    }
    button {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.1s, opacity 0.2s;
    }
    button:hover { opacity: 0.95; }
    button:active { transform: scale(0.98); }
    .error-box {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      padding: 10px;
      border-radius: 10px;
      margin-bottom: 1.2rem;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <div class="login-card">
    <div class="logo-badge">📊</div>
    <h2>داشبورد ربات قیمت</h2>
    <p class="desc">برای دسترسی به تنظیمات، رمز عبور را وارد کنید</p>
    ${errorMsg ? `<div class="error-box">${errorMsg}</div>` : ""}
    <form method="POST" action="/admin/login">
      <div class="input-wrap">
        <label>رمز عبور مدیریت:</label>
        <input type="password" name="password" placeholder="••••••••" required autofocus>
      </div>
      <button type="submit">ورود به پنل 🚀</button>
    </form>
  </div>
</body>
</html>`;
}
