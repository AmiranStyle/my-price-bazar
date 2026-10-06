// ==========================================
// ⚙️ تب تنظیمات عمومی
// ==========================================

export function renderGeneralTab(settings, message = "") {
  const msgHtml = message ? `<div class="msg msg-success">${message}</div>` : "";

  return `
<div class="card">
<h3>⚙️ تنظیمات عمومی</h3>
${msgHtml}
<form method="POST" action="/admin/save-general">
<div class="form-group">
<label>📢 کانال هدف (با @):</label>
<input type="text" name="channel_id" value="${settings.channel_id}" required>
</div>
<div class="form-group">
<label>👤 آیدی مدیر (برای دریافت هشدارها):</label>
<input type="text" name="admin_id" value="${settings.admin_id}" required>
</div>
<button type="submit" class="btn btn-primary">💾 ذخیره تنظیمات</button>
</form>
</div>
<div class="card">
<h3>🚀 عملیات سریع</h3>
<div style="text-align:center">
<a href="/send" class="btn btn-success">📤 ارسال دستی به کانال</a>
<a href="/test-api" class="btn btn-primary">🧪 تست قیمت‌ها</a>
<a href="/logout" class="btn btn-danger">🚪 خروج</a>
</div>
</div>`;
}
