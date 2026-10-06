// ==========================================
// 📊 تب مدیریت نمادها
// ==========================================

// نام نمایشی منبع
function getSourceName(type) {
  const names = { tgju: "TGJU", nobitex: "نوبیتکس", emofid: "ایموفید", custom: "سفارشی" };
  return names[type] || type;
}

// لیست نمادها
export function renderSymbolsTab(settings, message = "") {
  const msgHtml = message ? `<div class="msg msg-success">${message}</div>` : "";

  const rows = settings.symbols.map((s, i) => `
<tr>
<td>${s.emoji || "📌"} ${s.name}</td>
<td>${getSourceName(s.source_type)}</td>
<td>${s.enabled ? '<span class="status-ok">✅ فعال</span>' : '<span class="status-off">❌ غیرفعال</span>'}</td>
<td>
<a href="/admin/symbols/edit?index=${i}" class="btn btn-warning" style="padding:6px 12px">✏️ ویرایش</a>
<a href="/admin/symbols/toggle?index=${i}" class="btn btn-secondary" style="padding:6px 12px">${s.enabled ? '🚫 غیرفعال' : '✅ فعال'}</a>
<a href="/admin/symbols/delete?index=${i}" class="btn btn-danger" style="padding:6px 12px" onclick="return confirm('آیا مطمئن هستید؟')">🗑 حذف</a>
</td>
</tr>`).join("");

  return `
<div class="card">
<h3>📊 لیست نمادهای فعال</h3>
${msgHtml}
<table>
<tr><th>نام نماد</th><th>منبع</th><th>وضعیت</th><th>عملیات</th></tr>
${rows}
</table>
<div style="margin-top:1rem;text-align:center">
<a href="/admin/symbols/edit?index=new" class="btn btn-success">➕ افزودن نماد جدید</a>
</div>
</div>`;
}

// فرم افزودن/ویرایش نماد
export function renderSymbolEditForm(symbol, index) {
  const isNew = index === "new";
  const s = symbol || { id: "", name: "", emoji: "📌", source_type: "tgju", source_slug: "", label: "نرخ فعلی", is_rial: true, min: 0, max: 999999999, enabled: true };

  return `
<div class="card">
<h3>${isNew ? "➕ افزودن نماد جدید" : "✏️ ویرایش نماد: " + s.name}</h3>
<form method="POST" action="/admin/symbols/save">
<input type="hidden" name="index" value="${index}">
<div class="form-group">
<label>🆔 شناسه یکتا (انگلیسی، بدون فاصله):</label>
<input type="text" name="id" value="${s.id}" required placeholder="مثال: gold18" ${isNew ? "" : "readonly"}>
</div>
<div class="form-group">
<label>📛 نام نمایشی:</label>
<input type="text" name="name" value="${s.name}" required placeholder="مثال: طلای ۱۸ عیار">
</div>
<div class="form-group">
<label>🎨 ایموجی:</label>
<input type="text" name="emoji" value="${s.emoji}" placeholder="مثال: 🔸">
</div>
<div class="form-group">
<label>🔗 نوع منبع:</label>
<select name="source_type" required>
<option value="tgju" ${s.source_type === "tgju" ? "selected" : ""}>TGJU (شبکه اطلاع‌رسانی طلا)</option>
<option value="nobitex" ${s.source_type === "nobitex" ? "selected" : ""}>نوبیتکس (API رمزارز)</option>
<option value="emofid" ${s.source_type === "emofid" ? "selected" : ""}>ایموفید (صندوق‌ها)</option>
<option value="custom" ${s.source_type === "custom" ? "selected" : ""}>صفحه سفارشی (آدرس مستقیم)</option>
</select>
</div>
<div class="form-group">
<label>📍 آدرس/اسلاگ منبع:</label>
<input type="text" name="source_slug" value="${s.source_slug}" required placeholder="برای TGJU: اسلاگ | برای بقیه: URL کامل">
<small style="color:#666">برای TGJU فقط اسلاگ (مثل: geram18)، برای بقیه آدرس کامل.</small>
</div>
<div class="form-group">
<label>🏷 لیبل جستجو در صفحه:</label>
<input type="text" name="label" value="${s.label}" placeholder="مثال: نرخ فعلی">
</div>
<div class="form-group">
<label>💱 واحد منبع:</label>
<select name="is_rial">
<option value="true" ${s.is_rial ? "selected" : ""}>ریال (تبدیل به تومان می‌شود)</option>
<option value="false" ${!s.is_rial ? "selected" : ""}>تومان (بدون تبدیل)</option>
</select>
</div>
<div style="display:flex;gap:1rem">
<div class="form-group" style="flex:1">
<label>📉 حداقل قیمت مجاز (تومان):</label>
<input type="number" name="min" value="${s.min}" required>
</div>
<div class="form-group" style="flex:1">
<label>📈 حداکثر قیمت مجاز (تومان):</label>
<input type="number" name="max" value="${s.max}" required>
</div>
</div>
<div class="form-group">
<label>
<input type="checkbox" name="enabled" ${s.enabled ? "checked" : ""}> فعال باشد
</label>
</div>
<button type="submit" class="btn btn-primary">💾 ذخیره نماد</button>
<a href="/admin/symbols" class="btn btn-secondary">انصراف</a>
</form>
</div>`;
}
