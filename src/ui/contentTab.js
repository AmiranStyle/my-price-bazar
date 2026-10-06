// ==========================================
// 📝 تب محتوا و تصویر
// ==========================================

export function renderContentTab(settings, message = "") {
  const msgHtml = message ? `<div class="msg msg-success">${message}</div>` : "";

  return `
<div class="card">
<h3>📝 قالب کپشن</h3>
${msgHtml}
<p style="font-size:.9rem;color:#666;margin-bottom:1rem">
متغیرهای قابل استفاده: <code>{date}</code> تاریخ | <code>{time}</code> ساعت | <code>{prices}</code> لیست قیمت‌ها | <code>{channel}</code> آیدی کانال
</p>
<form method="POST" action="/admin/content/save">
<div class="form-group">
<label>📋 قالب کپشن:</label>
<textarea name="caption_template" rows="10">${settings.caption_template}</textarea>
</div>
<div class="form-group">
<label>🖼 لینک تصویر پست:</label>
<input type="text" name="photo_url" value="${settings.photo_url}" required>
<small style="color:#666">لینک مستقیم تصویر (مثلاً از PostImg یا سرویس‌های مشابه)</small>
</div>
<button type="submit" class="btn btn-primary">💾 ذخیره محتوا</button>
</form>
</div>
<div class="card">
<h3>👁 پیش‌نمایش زنده</h3>
<p style="font-size:.9rem;color:#666">برای دیدن پیش‌نمایش واقعی، روی دکمه زیر کلیک کنید:</p>
<a href="/preview" class="btn btn-warning" style="margin-top:.5rem">👁 پیش‌نمایش پست</a>
</div>`;
}
