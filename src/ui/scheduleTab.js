// ==========================================
// ⏰ تب زمان‌بندی ارسال
// ==========================================

import { tehranTimeToUTC } from '../utils/datetime.js';

export function renderScheduleTab(settings, message = "") {
  const msgHtml = message ? `<div class="msg msg-success">${message}</div>` : "";

  const rows = settings.schedules.map((sch, i) => {
    const utcTime = tehranTimeToUTC(sch.time);
    return `
<tr>
<td>⏰ ${sch.time} (تهران)</td>
<td>${utcTime} (UTC)</td>
<td>${sch.enabled ? '<span class="status-ok">✅ فعال</span>' : '<span class="status-off">❌ غیرفعال</span>'}</td>
<td>
<a href="/admin/schedule/toggle?index=${i}" class="btn btn-secondary" style="padding:6px 12px">${sch.enabled ? '🚫 غیرفعال' : '✅ فعال'}</a>
<a href="/admin/schedule/delete?index=${i}" class="btn btn-danger" style="padding:6px 12px" onclick="return confirm('آیا مطمئن هستید؟')">🗑 حذف</a>
</td>
</tr>`;
  }).join("");

  return `
<div class="card">
<h3>⏰ زمان‌بندی ارسال خودکار</h3>
${msgHtml}
<p style="font-size:.9rem;color:#666;margin-bottom:1rem">
سیستم هر ۱۰ دقیقه زمان‌های فعال را بررسی می‌کند و در صورت رسیدن ساعت، پست را ارسال می‌کند.
</p>
<table>
<tr><th>ساعت (تهران)</th><th>معادل UTC</th><th>وضعیت</th><th>عملیات</th></tr>
${rows}
</table>
<div style="margin-top:1.5rem">
<h4 style="margin-bottom:1rem">➕ افزودن زمان جدید</h4>
<form method="POST" action="/admin/schedule/add">
<div style="display:flex;gap:1rem;align-items:end">
<div class="form-group" style="flex:1;margin-bottom:0">
<label>ساعت ارسال (به وقت تهران):</label>
<input type="time" name="time" required value="19:00">
</div>
<button type="submit" class="btn btn-success">➕ افزودن</button>
</div>
</form>
</div>
</div>`;
}
