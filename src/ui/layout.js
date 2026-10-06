// ==========================================
// 🖼 لی‌اوت اصلی داشبورد
// ==========================================

export function renderDashboardLayout(activeTab, contentHtml) {
  const tabs = [
    { id: "general", label: "⚙️ عمومی", path: "/admin" },
    { id: "symbols", label: "📊 نمادها", path: "/admin/symbols" },
    { id: "schedule", label: "⏰ زمان‌بندی", path: "/admin/schedule" },
    { id: "content", label: "📝 محتوا و تصویر", path: "/admin/content" }
  ];

  const tabsHtml = tabs.map(t =>
    `<a href="${t.path}" style="padding:10px 16px;background:${activeTab === t.id ? '#4dabf7' : 'rgba(255,255,255,.1)'};color:#fff;text-decoration:none;border-radius:8px;margin:4px;display:inline-block;">${t.label}</a>`
  ).join("");

  return `<!DOCTYPE html>
<html dir="rtl" lang="fa"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>داشبورد مدیریت ربات</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Tahoma,Arial,sans-serif;background:#f0f2f5;padding:1rem;color:#333}
.container{max-width:900px;margin:0 auto}
.header{background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:1.2rem;border-radius:12px;margin-bottom:1rem;text-align:center}
.header h2{font-size:1.3rem}
.tabs{background:#fff;padding:1rem;border-radius:12px;margin-bottom:1rem;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.card{background:#fff;padding:1.5rem;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);margin-bottom:1rem}
.card h3{margin-bottom:1rem;color:#16213e}
.form-group{margin-bottom:1rem}
.form-group label{display:block;margin-bottom:6px;font-weight:bold;font-size:.9rem}
.form-group input,.form-group textarea,.form-group select{width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-family:inherit;font-size:.95rem}
.form-group textarea{min-height:120px;resize:vertical}
.btn{display:inline-block;padding:10px 20px;margin:4px;color:#fff;text-decoration:none;border-radius:6px;font-size:.9rem;cursor:pointer;border:none}
.btn-primary{background:#4dabf7}
.btn-success{background:#28a745}
.btn-danger{background:#dc3545}
.btn-warning{background:#ffc107;color:#333}
.btn-secondary{background:#6c757d}
table{width:100%;border-collapse:collapse;margin-top:1rem}
th,td{padding:10px;border-bottom:1px solid #eee;text-align:right;font-size:.9rem}
th{background:#f8f9fa}
.status-ok{color:#28a745}
.status-off{color:#dc3545}
.msg{padding:10px;border-radius:6px;margin-bottom:1rem}
.msg-success{background:#d4edda;color:#155724}
.msg-error{background:#f8d7da;color:#721c24}
</style></head><body>
<div class="container">
<div class="header">
<h2>📊 داشبورد مدیریت ربات قیمت</h2>
<p style="margin-top:6px;font-size:.85rem;opacity:.8">نسخه ۴.۱ | معماری ماژولار</p>
</div>
<div class="tabs">${tabsHtml}</div>
${contentHtml}
</div></body></html>`;
}
