// ==========================================
// 🚀 داشبورد مدرن تک‌صفحه‌ای با مدیریت بی‌نهایت منبع و تست مجزا
// ==========================================

export function renderDashboardSPA(settings) {
  const settingsJson = JSON.stringify(settings).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>مدیریت ربات قیمت‌دهی | Price Bazar</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: rgba(30, 41, 59, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Vazirmatn, Tahoma, sans-serif; }
    body { background: var(--bg); color: var(--text); min-height: 100vh; padding: 1.5rem; }
    .container { max-width: 980px; margin: 0 auto; }
    
    .header {
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;
      background: var(--card-bg); backdrop-filter: blur(12px); border: 1px solid var(--card-border);
      padding: 1.25rem 1.5rem; border-radius: 16px; margin-bottom: 1.5rem;
    }
    .header-info { display: flex; align-items: center; gap: 12px; }
    .header-logo { font-size: 2rem; background: rgba(59, 130, 246, 0.15); padding: 8px 12px; border-radius: 12px; }
    .header-title h1 { font-size: 1.2rem; font-weight: 700; }
    .header-title p { font-size: 0.8rem; color: var(--text-muted); }
    .header-actions { display: flex; gap: 8px; }
    
    .btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px;
      font-size: 0.85rem; font-weight: 600; border: none; cursor: pointer; text-decoration: none;
      transition: all 0.2s ease; color: #fff;
    }
    .btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .btn-primary { background: var(--primary); }
    .btn-success { background: var(--success); }
    .btn-danger { background: var(--danger); }
    .btn-warning { background: var(--warning); color: #000; }
    .btn-secondary { background: rgba(255, 255, 255, 0.1); color: var(--text); }
    .btn-info { background: #06b6d4; color: #fff; }
    .btn-sm { padding: 5px 10px; font-size: 0.75rem; border-radius: 8px; }

    .nav-tabs {
      display: flex; gap: 8px; background: var(--card-bg); backdrop-filter: blur(12px);
      border: 1px solid var(--card-border); padding: 8px; border-radius: 14px; margin-bottom: 1.5rem;
      overflow-x: auto;
    }
    .tab-btn {
      flex: 1; padding: 10px 16px; background: transparent; border: none; color: var(--text-muted);
      font-size: 0.9rem; font-weight: 600; border-radius: 10px; cursor: pointer; transition: all 0.2s ease; white-space: nowrap;
    }
    .tab-btn.active { background: var(--primary); color: #fff; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }

    .card {
      background: var(--card-bg); backdrop-filter: blur(12px); border: 1px solid var(--card-border);
      border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem;
    }
    .card h3 { font-size: 1.1rem; margin-bottom: 1rem; color: #fff; display: flex; align-items: center; gap: 8px; }

    .form-group { margin-bottom: 1.2rem; }
    .form-group label { display: block; font-size: 0.85rem; color: #cbd5e1; margin-bottom: 6px; font-weight: 500; }
    .form-group input, .form-group textarea, .form-group select {
      width: 100%; padding: 10px 14px; background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 10px; color: #fff;
      font-size: 0.9rem; outline: none; transition: all 0.2s ease;
    }
    .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
      border-color: var(--primary); box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
    }
    .form-row { display: flex; gap: 1rem; flex-wrap: wrap; }
    .form-row .form-group { flex: 1; min-width: 160px; }

    .table-responsive { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; text-align: right; }
    th { padding: 12px; color: var(--text-muted); font-size: 0.8rem; border-bottom: 1px solid var(--card-border); font-weight: 600; }
    td { padding: 12px; font-size: 0.85rem; border-bottom: 1px solid rgba(255, 255, 255, 0.04); vertical-align: middle; }
    tr:hover td { background: rgba(255, 255, 255, 0.02); }

    .badge { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
    .badge-success { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .badge-danger { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    .switch-btn { cursor: pointer; user-select: none; }

    .tab-pane { display: none; }
    .tab-pane.active { display: block; animation: fadeIn 0.25s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

    #toast {
      position: fixed; bottom: 24px; left: 24px; padding: 12px 20px; border-radius: 12px;
      background: #1e293b; color: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      border: 1px solid rgba(255, 255, 255, 0.1); font-size: 0.9rem; display: flex; align-items: center;
      gap: 10px; transform: translateY(100px); opacity: 0; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); z-index: 9999;
    }
    #toast.show { transform: translateY(0); opacity: 1; }

    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(6px); display: none; align-items: center; justify-content: center; padding: 1rem; z-index: 1000;
    }
    .modal-overlay.show { display: flex; animation: fadeIn 0.2s ease; }
    .modal-box {
      background: #1e293b; border: 1px solid var(--card-border); border-radius: 16px;
      width: 100%; max-width: 680px; max-height: 90vh; overflow-y: auto; padding: 1.5rem;
    }
    .source-item {
      background: rgba(15, 23, 42, 0.6); border: 1px solid var(--card-border); border-radius: 12px;
      padding: 12px; margin-bottom: 12px; position: relative;
    }
    .source-item-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 0.85rem; font-weight: 600; color: #93c5fd;
    }
  </style>
</head>
<body>

<div class="container">
  <div class="header">
    <div class="header-info">
      <div class="header-logo">📊</div>
      <div class="header-title">
        <h1>داشبورد ربات قیمت‌دهی روزانه</h1>
        <p>معماری بی‌نهایت منبع (Dynamic Sources & Multi-Test)</p>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn btn-success" onclick="triggerManualSend()">📤 ارسال آنی</button>
      <button class="btn btn-primary" onclick="testPricesApi()">🧪 تست همه قیمت‌ها</button>
      <a href="/logout" class="btn btn-danger">🚪 خروج</a>
    </div>
  </div>

  <div class="nav-tabs">
    <button class="tab-btn active" onclick="switchTab('general')">⚙️ عمومی</button>
    <button class="tab-btn" onclick="switchTab('symbols')">📊 نمادها</button>
    <button class="tab-btn" onclick="switchTab('schedule')">⏰ زمان‌بندی</button>
    <button class="tab-btn" onclick="switchTab('content')">📝 قالب و محتوا</button>
  </div>

  <!-- TAB 1: GENERAL -->
  <div id="tab-general" class="tab-pane active">
    <div class="card">
      <h3>⚙️ تنظیمات کانال و ارتباطات</h3>
      <form id="form-general" onsubmit="saveGeneral(event)">
        <div class="form-group">
          <label>📢 آیدی کانال هدف (همراه با @ یا آیدی عددی):</label>
          <input type="text" id="gen-channel-id" required>
        </div>
        <div class="form-group">
          <label>👤 آیدی عددی مدیر تلگرام (جهت دریافت خطاها و هشدارها):</label>
          <input type="text" id="gen-admin-id" required>
        </div>
        <button type="submit" class="btn btn-primary">💾 ذخیره تنظیمات عمومی</button>
      </form>
    </div>
  </div>

  <!-- TAB 2: SYMBOLS -->
  <div id="tab-symbols" class="tab-pane">
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <h3>📊 لیست نمادها و منابع آبشاری</h3>
        <button class="btn btn-success btn-sm" onclick="openSymbolModal('new')">➕ افزودن نماد جدید</button>
      </div>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>نماد و نام</th>
              <th>تعداد منابع فعال</th>
              <th>وضعیت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody id="symbols-table-body"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- TAB 3: SCHEDULE -->
  <div id="tab-schedule" class="tab-pane">
    <div class="card">
      <h3>⏰ زمان‌بندی ارسال خودکار (تهران)</h3>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>ساعت تهران</th>
              <th>وضعیت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody id="schedule-table-body"></tbody>
        </table>
      </div>
      <div style="margin-top:1.5rem; padding-top:1rem; border-top:1px solid var(--card-border);">
        <h4 style="font-size:0.95rem; margin-bottom:10px;">➕ افزودن زمان ارسال جدید</h4>
        <div style="display:flex; gap:10px; max-width:320px;">
          <input type="time" id="new-schedule-time" value="19:00" style="padding:8px 12px; background:rgba(15,23,42,0.6); border:1px solid var(--card-border); color:#fff; border-radius:8px;">
          <button class="btn btn-success" onclick="addSchedule()">ثبت زمان</button>
        </div>
      </div>
    </div>
  </div>

  <!-- TAB 4: CONTENT -->
  <div id="tab-content" class="tab-pane">
    <div class="card">
      <h3>📝 قالب متن و تصویر پست</h3>
      <form id="form-content" onsubmit="saveContent(event)">
        <div class="form-group">
          <label>🖼 لینک عکس بالای پست:</label>
          <input type="text" id="cnt-photo-url" required>
        </div>
        <div class="form-group">
          <label>📋 متن کپشن:</label>
          <textarea id="cnt-caption-template" rows="8"></textarea>
          <small style="color:var(--text-muted); display:block; margin-top:4px;">
            متغیرها: <code>{date}</code> تاریخ | <code>{time}</code> ساعت | <code>{prices}</code> نرخ‌ها | <code>{channel}</code> آیدی کانال
          </small>
        </div>
        <div style="display:flex; gap:10px;">
          <button type="submit" class="btn btn-primary">💾 ذخیره قالب</button>
          <button type="button" class="btn btn-warning" onclick="fetchLivePreview()">👁 پیش‌نمایش آنی</button>
        </div>
      </form>
    </div>

    <div class="card" id="preview-box" style="display:none;">
      <h3>👁 نتیجه پیش‌نمایش در کانال</h3>
      <div style="text-align:center; margin-bottom:12px;">
        <img id="preview-img" src="" style="max-height:220px; border-radius:12px; border:1px solid var(--card-border); max-width:100%;">
      </div>
      <pre id="preview-text" style="background:rgba(15,23,42,0.8); padding:1rem; border-radius:10px; white-space:pre-wrap; font-size:0.9rem; line-height:1.6; border:1px solid var(--card-border);"></pre>
    </div>
  </div>
</div>

<!-- Modal: Symbol Edit/Add with Dynamic Multiple Sources -->
<div class="modal-overlay" id="symbol-modal">
  <div class="modal-box">
    <h3 id="modal-title" style="margin-bottom:1rem;">ویرایش نماد</h3>
    <form id="form-symbol" onsubmit="saveSymbolForm(event)">
      <input type="hidden" id="sym-index">
      
      <div class="form-group">
        <label>شناسه یکتا (انگلیسی، بدون فاصله):</label>
        <input type="text" id="sym-id" required placeholder="مثلاً: ayar">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>نام فارسی:</label>
          <input type="text" id="sym-name" required placeholder="مثلاً: صندوق عیار">
        </div>
        <div class="form-group" style="max-width:100px;">
          <label>ایموجی:</label>
          <input type="text" id="sym-emoji" placeholder="🔹">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>حداقل قیمت مجاز (تومان):</label>
          <input type="number" id="sym-min" required>
        </div>
        <div class="form-group">
          <label>حداکثر قیمت مجاز (تومان):</label>
          <input type="number" id="sym-max" required>
        </div>
      </div>

      <!-- منابع پویا (Dynamic Sources) -->
      <div style="margin: 1.5rem 0 0.5rem; display:flex; justify-content:space-between; align-items:center;">
        <h4 style="font-size:0.95rem; color:#93c5fd;">🔗 منابع دریافت قیمت (به ترتیب اولویت):</h4>
        <button type="button" class="btn btn-info btn-sm" onclick="addSourceField()">➕ افزودن منبع</button>
      </div>
      <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:1rem;">
        سیستم به ترتیب از منبع اول استخراج می‌کند؛ در صورت قطعی یا خطا، فوراً به سراغ منبع بعدی می‌رود.
      </p>

      <div id="sources-container"></div>

      <div style="display:flex; justify-content:space-between; gap:8px; margin-top:1.5rem;">
        <button type="button" class="btn btn-warning" onclick="testCurrentModalSymbol()">🧪 تست زنده این نماد</button>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn btn-secondary" onclick="closeSymbolModal()">انصراف</button>
          <button type="submit" class="btn btn-primary">💾 ذخیره نماد</button>
        </div>
      </div>
    </form>
  </div>
</div>

<!-- Modal: Test Diagnostics Viewer -->
<div class="modal-overlay" id="diag-modal">
  <div class="modal-box">
    <h3 id="diag-title" style="margin-bottom:1rem;">نتیجه تست تشخیصی نماد</h3>
    <div id="diag-body" style="font-size:0.85rem; line-height:1.6;"></div>
    <div style="text-align:left; margin-top:1.5rem;">
      <button class="btn btn-secondary" onclick="document.getElementById('diag-modal').classList.remove('show')">بستن</button>
    </div>
  </div>
</div>

<div id="toast">🔔 <span id="toast-text"></span></div>

<script>
  let state = ${settingsJson};

  function showToast(msg, isSuccess = true) {
    const toast = document.getElementById("toast");
    document.getElementById("toast-text").innerText = msg;
    toast.style.borderColor = isSuccess ? "var(--success)" : "var(--danger)";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3200);
  }

  function switchTab(tabId) {
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("tab-" + tabId).classList.add("active");
    event.target.classList.add("active");
  }

  function normalizeSym(s) {
    if (!s.sources || !Array.isArray(s.sources) || s.sources.length === 0) {
      s.sources = [];
      if (s.source_type) {
        s.sources.push({ type: s.source_type, target: s.source_slug || "", label: s.label || "", is_rial: s.is_rial !== false });
      }
      if (s.fallback_type && s.fallback_type !== "none") {
        s.sources.push({ type: s.fallback_type, target: s.fallback_slug || "", label: s.fallback_label || "", is_rial: s.fallback_is_rial !== false });
      }
    }
    return s;
  }

  function renderSymbols() {
    const tbody = document.getElementById("symbols-table-body");
    tbody.innerHTML = state.symbols.map((rawS, i) => {
      const s = normalizeSym(rawS);
      const srcCount = s.sources.length;
      return \`
        <tr>
          <td><strong>\${s.emoji || "📌"} \${s.name}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(\${s.id})</span></td>
          <td><span class="badge" style="background:rgba(255,255,255,0.08);">\${srcCount} منبع تعریف‌شده</span></td>
          <td>
            <span class="badge \${s.enabled ? 'badge-success switch-btn' : 'badge-danger switch-btn'}" onclick="toggleSymbol(\${i})">
              \${s.enabled ? "فعال ✅" : "غیرفعال ❌"}
            </span>
          </td>
          <td>
            <button class="btn btn-info btn-sm" onclick="testSymbolRow(\${i})">🧪 تست نماد</button>
            <button class="btn btn-warning btn-sm" onclick="openSymbolModal(\${i})">✏️ ویرایش</button>
            <button class="btn btn-danger btn-sm" onclick="deleteSymbol(\${i})">🗑 حذف</button>
          </td>
        </tr>
      \`;
    }).join("");
  }

  function renderSchedules() {
    const tbody = document.getElementById("schedule-table-body");
    tbody.innerHTML = state.schedules.map((sch, i) => \`
      <tr>
        <td><strong>⏰ \${sch.time}</strong></td>
        <td>
          <span class="badge \${sch.enabled ? 'badge-success switch-btn' : 'badge-danger switch-btn'}" onclick="toggleSchedule(\${i})">
            \${sch.enabled ? "فعال ✅" : "غیرفعال ❌"}
          </span>
        </td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteSchedule(\${i})">🗑 حذف</button>
        </td>
      </tr>
    \`).join("");
  }

  function initFormValues() {
    document.getElementById("gen-channel-id").value = state.channel_id;
    document.getElementById("gen-admin-id").value = state.admin_id;
    document.getElementById("cnt-photo-url").value = state.photo_url;
    document.getElementById("cnt-caption-template").value = state.caption_template;
    renderSymbols();
    renderSchedules();
  }

  async function syncSettings(newSettings, successMsg = "با موفقیت ذخیره شد") {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings)
      });
      const data = await res.json();
      if (data.ok) {
        state = newSettings;
        showToast(successMsg, true);
        initFormValues();
      } else {
        showToast("خطا: " + data.error, false);
      }
    } catch (e) {
      showToast("خطا در ارتباط با سرور", false);
    }
  }

  function saveGeneral(e) {
    e.preventDefault();
    const updated = { ...state };
    updated.channel_id = document.getElementById("gen-channel-id").value.trim();
    updated.admin_id = document.getElementById("gen-admin-id").value.trim();
    syncSettings(updated, "تنظیمات عمومی ذخیره شد");
  }

  function saveContent(e) {
    e.preventDefault();
    const updated = { ...state };
    updated.photo_url = document.getElementById("cnt-photo-url").value.trim();
    updated.caption_template = document.getElementById("cnt-caption-template").value;
    syncSettings(updated, "محتوا ذخیره شد");
  }

  function toggleSymbol(idx) {
    const updated = { ...state };
    updated.symbols[idx].enabled = !updated.symbols[idx].enabled;
    syncSettings(updated, "وضعیت نماد تغییر کرد");
  }

  function deleteSymbol(idx) {
    if (!confirm("آیا از حذف این نماد اطمینان دارید؟")) return;
    const updated = { ...state };
    updated.symbols.splice(idx, 1);
    syncSettings(updated, "نماد حذف شد");
  }

  // اضافه کردن یک فیلد منبع به فرم مدال
  function addSourceField(src = null) {
    const s = src || { type: "tgju", target: "", label: "", is_rial: true };
    const container = document.getElementById("sources-container");
    const div = document.createElement("div");
    div.className = "source-item";
    const idx = container.children.length + 1;
    div.innerHTML = \`
      <div class="source-item-header">
        <span>منبع شماره \${idx}</span>
        <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.source-item').remove()">🗑 حذف این منبع</button>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>نوع سرویس / سایت:</label>
          <select class="src-type">
            <option value="emofid" \${s.type === "emofid" ? "selected" : ""}>ایموفید (Emofid)</option>
            <option value="tgju" \${s.type === "tgju" ? "selected" : ""}>شبکه طلا و ارز (TGJU)</option>
            <option value="nobitex" \${s.type === "nobitex" ? "selected" : ""}>صرافی نوبیتکس (Nobitex)</option>
            <option value="tsetmc" \${s.type === "tsetmc" ? "selected" : ""}>سازمان بورس (TSETMC)</option>
            <option value="custom" \${s.type === "custom" ? "selected" : ""}>صفحه وب سفارشی</option>
          </select>
        </div>
        <div class="form-group">
          <label>واحد منبع:</label>
          <select class="src-is-rial">
            <option value="true" \${s.is_rial !== false ? "selected" : ""}>ریال (تقسیم بر ۱۰)</option>
            <option value="false" \${s.is_rial === false ? "selected" : ""}>تومان (بدون تغییر)</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>اسلاگ، نماد یا URL کامل:</label>
        <input type="text" class="src-target" value="\${s.target || ""}" required placeholder="مثلاً: gc3 یا USDTIRT یا IRO9AYAR0001 یا URL">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>لیبل جستجو (اختیاری - خودکار شناسایی می‌شود):</label>
        <input type="text" class="src-label" value="\${s.label || ""}" placeholder="خالی بگذارید تا خودکار پیدا کند یا مثلاً: قیمت صدور / نرخ فعلی">
      </div>
    \`;
    container.appendChild(div);
  }

  function openSymbolModal(idx) {
    const modal = document.getElementById("symbol-modal");
    document.getElementById("sym-index").value = idx;
    const container = document.getElementById("sources-container");
    container.innerHTML = "";

    if (idx === "new") {
      document.getElementById("modal-title").innerText = "➕ افزودن نماد جدید";
      document.getElementById("sym-id").value = "";
      document.getElementById("sym-id").readOnly = false;
      document.getElementById("sym-name").value = "";
      document.getElementById("sym-emoji").value = "📌";
      document.getElementById("sym-min").value = 1000;
      document.getElementById("sym-max").value = 999999999;
      addSourceField({ type: "tgju", target: "", label: "", is_rial: true });
    } else {
      const s = normalizeSym(state.symbols[idx]);
      document.getElementById("modal-title").innerText = "✏️ ویرایش نماد: " + s.name;
      document.getElementById("sym-id").value = s.id;
      document.getElementById("sym-id").readOnly = true;
      document.getElementById("sym-name").value = s.name;
      document.getElementById("sym-emoji").value = s.emoji || "";
      document.getElementById("sym-min").value = s.min;
      document.getElementById("sym-max").value = s.max;

      if (s.sources.length === 0) {
        addSourceField();
      } else {
        s.sources.forEach(src => addSourceField(src));
      }
    }
    modal.classList.add("show");
  }

  function closeSymbolModal() {
    document.getElementById("symbol-modal").classList.remove("show");
  }

  function collectModalSymbol() {
    const idx = document.getElementById("sym-index").value;
    const container = document.getElementById("sources-container");
    const sourceItems = container.querySelectorAll(".source-item");
    const sources = [];

    sourceItems.forEach(item => {
      sources.push({
        type: item.querySelector(".src-type").value,
        target: item.querySelector(".src-target").value.trim(),
        label: item.querySelector(".src-label").value.trim(),
        is_rial: item.querySelector(".src-is-rial").value === "true"
      });
    });

    return {
      id: document.getElementById("sym-id").value.trim(),
      name: document.getElementById("sym-name").value.trim(),
      emoji: document.getElementById("sym-emoji").value.trim() || "📌",
      min: Number(document.getElementById("sym-min").value) || 0,
      max: Number(document.getElementById("sym-max").value) || 999999999,
      enabled: idx === "new" ? true : state.symbols[idx].enabled,
      sources
    };
  }

  function saveSymbolForm(e) {
    e.preventDefault();
    const idx = document.getElementById("sym-index").value;
    const symObj = collectModalSymbol();

    if (symObj.sources.length === 0) {
      alert("حداقل یک منبع برای این نماد باید اضافه کنید!");
      return;
    }

    const updated = { ...state };
    if (idx === "new") {
      updated.symbols.push(symObj);
    } else {
      updated.symbols[Number(idx)] = symObj;
    }
    closeSymbolModal();
    syncSettings(updated, "نماد و منابع ذخیره شدند");
  }

  // تست اختصاصی تمام منابع یک نماد
  async function runSymbolTest(symbol) {
    showToast("در حال تست تک‌تک منابع نماد...", true);
    try {
      const res = await fetch("/api/test-symbol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      const d = data.diagnostics;
      let html = \`<div style="margin-bottom:12px;"><strong>نماد:</strong> \${d.symbolName} (\${d.symbolId})</div>\`;
      html += \`<div style="margin-bottom:12px;"><strong>قیمت نهایی انتخابی:</strong> <span style="color:#10b981; font-weight:bold;">\${d.finalPrice ? d.finalPrice.toLocaleString('fa-IR') + ' تومان' : 'ناموفق'}</span></div>\`;
      html += \`<table style="width:100%; border-collapse:collapse; margin-top:10px;">
        <thead>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
            <th style="padding:6px;">اولویت</th>
            <th style="padding:6px;">سرویس</th>
            <th style="padding:6px;">آدرس/اسلاگ</th>
            <th style="padding:6px;">وضعیت</th>
            <th style="padding:6px;">قیمت (تومان)</th>
          </tr>
        </thead>
        <tbody>\`;

      d.results.forEach(r => {
        const isOk = r.status === "success";
        html += \`
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:8px;">\${r.index}</td>
            <td style="padding:8px;"><span class="badge" style="background:rgba(255,255,255,0.1);">\${r.type}</span></td>
            <td style="padding:8px; font-size:0.75rem; color:#94a3b8;">\${r.target}</td>
            <td style="padding:8px;">\${isOk ? '<span class="badge badge-success">موفق ✅</span>' : '<span class="badge badge-danger">خطا ❌</span>'}</td>
            <td style="padding:8px;">\${isOk ? r.toman.toLocaleString('fa-IR') : '<span style="font-size:0.75rem; color:#f87171;">' + (r.error || 'خطا') + '</span>'}</td>
          </tr>
        \`;
      });

      html += \`</tbody></table>\`;

      document.getElementById("diag-body").innerHTML = html;
      document.getElementById("diag-modal").classList.add("show");
    } catch (e) {
      showToast("خطا در اجرای تست: " + e.message, false);
    }
  }

  function testSymbolRow(idx) {
    const s = normalizeSym(state.symbols[idx]);
    runSymbolTest(s);
  }

  function testCurrentModalSymbol() {
    const s = collectModalSymbol();
    runSymbolTest(s);
  }

  function addSchedule() {
    const time = document.getElementById("new-schedule-time").value;
    if (!time) return;
    const updated = { ...state };
    updated.schedules.push({ id: "sch_" + Date.now(), time, enabled: true });
    syncSettings(updated, "زمان جدید اضافه شد");
  }

  function toggleSchedule(idx) {
    const updated = { ...state };
    updated.schedules[idx].enabled = !updated.schedules[idx].enabled;
    syncSettings(updated, "وضعیت زمان‌بندی تغییر کرد");
  }

  function deleteSchedule(idx) {
    const updated = { ...state };
    updated.schedules.splice(idx, 1);
    syncSettings(updated, "زمان حذف شد");
  }

  async function triggerManualSend() {
    if (!confirm("آیا پست لحظه‌ای به کانال تلگرام ارسال شود؟")) return;
    showToast("در حال پردازش و استخراج نرخ‌ها...", true);
    try {
      const res = await fetch("/send");
      const data = await res.json();
      if (data.ok) showToast("✅ پست با موفقیت در کانال منتشر شد!", true);
      else showToast("❌ خطا در ارسال: " + data.error, false);
    } catch(e) {
      showToast("خطا در ارسال درخواست به تلگرام", false);
    }
  }

  async function testPricesApi() {
    showToast("در حال دریافت تست قیمت‌ها...", true);
    try {
      const res = await fetch("/test-api");
      const data = await res.json();
      if (data.ok) {
        alert("نتیجه استخراج قیمت‌ها:\\n\\n" + JSON.stringify(data.data, null, 2));
      } else {
        alert("خطا در استخراج قیمت‌ها:\\n" + data.error);
      }
    } catch(e) {
      alert("خطا در تست API");
    }
  }

  async function fetchLivePreview() {
    showToast("در حال ساخت پیش‌نمایش...", true);
    try {
      const res = await fetch("/api/preview");
      const data = await res.json();
      if (data.ok) {
        document.getElementById("preview-img").src = state.photo_url;
        document.getElementById("preview-text").innerHTML = data.caption;
        document.getElementById("preview-box").style.display = "block";
        document.getElementById("preview-box").scrollIntoView({ behavior: 'smooth' });
      } else {
        showToast("خطا در پیش‌نمایش: " + data.error, false);
      }
    } catch(e) {
      showToast("خطا در تولید پیش‌نمایش", false);
    }
  }

  initFormValues();
</script>
</body>
</html>`;
}
