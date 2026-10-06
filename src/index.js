// ==========================================
// 📌 ربات قیمت‌دهی روزانه بازار - ورژن ۴.۰
// داینامیک | قابل مدیریت از داشبورد | چند نمادی
// ==========================================


// ==========================================
// 📌 ماژول ۱: ابزارهای عمومی (Utilities)
// ==========================================

function toEngDigits(str) {
  if (!str) return "";
  return String(str)
    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

function parseNumber(value) {
  if (!value) return null;
  const normalized = toEngDigits(String(value))
    .replace(/[,\u066C\u066B\s]/g, "")
    .trim();
  const num = Number(normalized);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function formatFa(num) {
  if (!Number.isFinite(Number(num))) return "نامشخص";
  return Number(num).toLocaleString("fa-IR");
}

function rialToToman(rial) {
  const value = parseNumber(rial);
  return value ? Math.round(value / 10) : null;
}

function getTehranDateTime() {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }).format(now);
  const timeStr = new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).format(now);
  return { dateStr, timeStr };
}

// تبدیل زمان تهران به ساعت UTC برای کرون
function tehranTimeToUTC(timeStr) {
  // زمان تهران = UTC+3:30
  const [h, m] = timeStr.split(":").map(Number);
  let utcH = h - 3;
  let utcM = m - 30;
  if (utcM < 0) { utcM += 60; utcH -= 1; }
  if (utcH < 0) utcH += 24;
  return `${String(utcH).padStart(2, "0")}:${String(utcM).padStart(2, "0")}`;
}

function htmlToText(html) {
  if (!html) return "";
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractNumberAfterLabel(text, label, maxChars = 120) {
  if (!text || !label) return null;
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `${escapedLabel}\\s*[:：:]*\\s*([0-9۰-۹٠-٩][0-9۰-۹٠-٩,٬\\. ]{0,${maxChars}})`,
    "i"
  );
  const match = text.match(pattern);
  if (!match || !match[1]) return null;
  const numberMatch = match[1].match(/[0-9۰-۹٠-٩][0-9۰-۹٠-٩,٬]*/);
  return numberMatch ? parseNumber(numberMatch[0]) : null;
}


// ==========================================
// 📌 ماژول ۲: هدرهای درخواست (Headers)
// ==========================================

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache"
};


// ==========================================
// 📌 ماژول ۳: مدیریت تنظیمات (KV Config Manager)
// ==========================================

// تنظیمات پیش‌فرض (اگر در KV نبود)
function getDefaultSettings(env) {
  return {
    channel_id: env.DEFAULT_CHANNEL_ID || "@PulseHub_co",
    admin_id: env.ADMIN_USER_ID || "165944913",
    photo_url: env.PHOTO_URL || "https://i.postimg.cc/1t65gR2L/Chat-GPT-Image-Aug-14-2026-02-44-30-AM.png",
    caption_template:
      "📊 <b>قیمت‌های لحظه‌ای بازار</b>\n" +
      "🗓 {date} | ساعت {time}\n\n" +
      "{prices}\n\n" +
      "#قیمت_طلا #تتر #سرمایه_گذاری\n\n" +
      "🆔 {channel}",
    symbols: [
      {
        id: "gold18",
        name: "طلای ۱۸ عیار",
        emoji: "🔸",
        source_type: "tgju",
        source_slug: "geram18",
        label: "نرخ فعلی",
        is_rial: true,
        min: 1000000,
        max: 150000000,
        enabled: true
      },
      {
        id: "usdt",
        name: "تتر (USDT)",
        emoji: "🟢",
        source_type: "nobitex",
        source_slug: "USDTIRT",
        label: "",
        is_rial: true,
        min: 20000,
        max: 500000,
        enabled: true
      },
      {
        id: "ayar",
        name: "صندوق عیار",
        emoji: "🔹",
        source_type: "emofid",
        source_slug: "https://www.emofid.com/funds/ayar/",
        label: "قیمت هر واحد",
        is_rial: true,
        min: 10000,
        max: 500000,
        enabled: true
      }
    ],
    schedules: [
      { id: "sch_1", time: "19:00", enabled: true }
    ]
  };
}

// خواندن تنظیمات از KV (با fallback به پیش‌فرض)
async function getSettings(env) {
  try {
    const stored = await env.BOT_CONFIG.get("settings", "json");
    if (stored && stored.symbols) return stored;
  } catch (e) {
    console.error("KV READ ERROR:", e.message);
  }
  return getDefaultSettings(env);
}

// ذخیره تنظیمات در KV
async function saveSettings(env, settings) {
  await env.BOT_CONFIG.put("settings", JSON.stringify(settings));
}

// خواندن لاگ ارسال‌های امروز (برای جلوگیری از ارسال تکراری)
async function getSentLog(env) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
  const key = `sent_log_${today}`;
  try {
    const log = await env.BOT_CONFIG.get(key, "json");
    return log || [];
  } catch (e) {
    return [];
  }
}

// ذخیره لاگ ارسال
async function addSentLog(env, timeStr) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
  const key = `sent_log_${today}`;
  const log = await getSentLog(env);
  if (!log.includes(timeStr)) {
    log.push(timeStr);
    await env.BOT_CONFIG.put(key, JSON.stringify(log), { expirationTtl: 172800 }); // ۴۸ ساعت
  }
}


// ==========================================
// 📌 ماژول ۴: موتور قیمت‌گیری داینامیک (Price Engine)
// ==========================================

// دریافت قیمت از TGJU
async function fetchFromTGJU(slug, label) {
  const response = await fetch(`https://www.tgju.org/profile/${slug}`, {
    method: "GET", headers: BROWSER_HEADERS
  });
  if (!response.ok) throw new Error(`TGJU HTTP ${response.status}`);
  const html = await response.text();
  const text = htmlToText(html);
  const price = extractNumberAfterLabel(text, label, 100);
  if (!price) throw new Error(`لیبل "${label}" در TGJU/${slug} پیدا نشد.`);
  return price;
}

// دریافت قیمت از Nobitex API
async function fetchFromNobitex(symbol) {
  const response = await fetch(`https://api.nobitex.ir/v2/orderbook/${symbol}`, {
    method: "GET", headers: { "Accept": "application/json" }
  });
  if (!response.ok) throw new Error(`Nobitex HTTP ${response.status}`);
  const data = await response.json();
  const price = parseNumber(data?.lastTradePrice);
  if (!price) throw new Error("قیمت در پاسخ نوبیتکس پیدا نشد.");
  return price;
}

// دریافت قیمت از Emofid
async function fetchFromEmofid(url, label) {
  const response = await fetch(url, {
    method: "GET", headers: BROWSER_HEADERS
  });
  if (!response.ok) throw new Error(`Emofid HTTP ${response.status}`);
  const html = await response.text();
  const text = htmlToText(html);
  const price =
    extractNumberAfterLabel(text, label, 100) ||
    extractNumberAfterLabel(text, "قیمت هر واحد", 100) ||
    extractNumberAfterLabel(text, "آخرین قیمت", 100);
  if (!price) throw new Error(`لیبل "${label}" در Emofid پیدا نشد.`);
  return price;
}

// دریافت قیمت از صفحه سفارشی (با لیبل دلخواه)
async function fetchFromCustom(url, label) {
  const response = await fetch(url, {
    method: "GET", headers: BROWSER_HEADERS
  });
  if (!response.ok) throw new Error(`Custom HTTP ${response.status}`);
  const html = await response.text();
  const text = htmlToText(html);
  const price = extractNumberAfterLabel(text, label, 150);
  if (!price) throw new Error(`لیبل "${label}" در صفحه سفارشی پیدا نشد.`);
  return price;
}

// تابع اصلی دریافت قیمت یک نماد
async function fetchSymbolPrice(symbol) {
  try {
    if (!symbol.enabled) return null;

    let rawPrice = null;

    switch (symbol.source_type) {
      case "tgju":
        rawPrice = await fetchFromTGJU(symbol.source_slug, symbol.label || "نرخ فعلی");
        break;
      case "nobitex":
        rawPrice = await fetchFromNobitex(symbol.source_slug);
        break;
      case "emofid":
        rawPrice = await fetchFromEmofid(symbol.source_slug, symbol.label || "قیمت هر واحد");
        break;
      case "custom":
        rawPrice = await fetchFromCustom(symbol.source_slug, symbol.label);
        break;
      default:
        throw new Error(`نوع منبع ناشناخته: ${symbol.source_type}`);
    }

    // تبدیل ریال به تومان در صورت نیاز
    let finalPrice = symbol.is_rial ? rialToToman(rawPrice) : parseNumber(rawPrice);

    // اعتبارسنجی محدوده
    if (!finalPrice || finalPrice < symbol.min || finalPrice > symbol.max) {
      throw new Error(`قیمت خارج از محدوده مجاز: ${finalPrice}`);
    }

    return finalPrice;
  } catch (error) {
    console.error(`SYMBOL ERROR [${symbol.name}]:`, error.message);
    return null;
  }
}

// دریافت قیمت همه نمادها
async function fetchAllPrices(settings) {
  const activeSymbols = settings.symbols.filter(s => s.enabled);
  const results = await Promise.all(
    activeSymbols.map(async (symbol) => ({
      symbol,
      price: await fetchSymbolPrice(symbol)
    }))
  );
  return results;
}


// ==========================================
// 📌 ماژول ۵: ارتباطات تلگرام (Telegram API)
// ==========================================

async function sendTelegramMessage(botToken, chatId, text, extra = {}) {
  if (!botToken) throw new Error("BOT_TOKEN تنظیم نشده است.");
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra })
    }
  );
  return await response.json();
}

async function sendErrorToAdmin(botToken, adminId, errorMsg, context = "نامشخص") {
  if (!botToken || !adminId) return;
  const nowFa = new Date().toLocaleString("fa-IR", {
    timeZone: "Asia/Tehran", dateStyle: "full", timeStyle: "short"
  });
  const message =
    `🚨 <b>خطای بحرانی در سیستم قیمت‌دهی</b>\n\n` +
    `📌 <b>بخش:</b> ${context}\n` +
    `⚠️ <b>جزئیات:</b>\n<code>${errorMsg}</code>\n` +
    `⏰ <b>زمان:</b> ${nowFa}`;
  try {
    await sendTelegramMessage(botToken, adminId, message);
  } catch (e) {
    console.error("FAILED TO SEND ERROR TO ADMIN:", e.message);
  }
}


// ==========================================
// 📌 ماژول ۶: ساخت و ارسال پست (Post Generator)
// ==========================================

async function generateCaption(settings, priceResults) {
  const { dateStr, timeStr } = getTehranDateTime();

  // ساخت بخش قیمت‌ها از روی نمادهای فعال
  const priceLines = priceResults
    .filter(r => r.price !== null)
    .map(r => `${r.symbol.emoji || "📌"} <b>${r.symbol.name}:</b> ${formatFa(r.price)} تومان`)
    .join("\n");

  if (!priceLines) {
    throw new Error("هیچ قیمتی با موفقیت دریافت نشد.");
  }

  // جایگزینی متغیرها در قالب کپشن
  let caption = settings.caption_template || getDefaultSettings().caption_template;
  caption = caption
    .replace(/\{date\}/g, dateStr)
    .replace(/\{time\}/g, timeStr)
    .replace(/\{prices\}/g, priceLines)
    .replace(/\{channel\}/g, settings.channel_id);

  return caption;
}

async function sendPostToChannel(botToken, settings) {
  if (!botToken) throw new Error("BOT_TOKEN تنظیم نشده است.");

  const priceResults = await fetchAllPrices(settings);
  const caption = await generateCaption(settings, priceResults);

  const payload = {
    chat_id: settings.channel_id,
    photo: settings.photo_url,
    caption: caption,
    parse_mode: "HTML"
  };

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendPhoto`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  );

  const result = await response.json();
  if (!result.ok) throw new Error(`Telegram API Error: ${result.description}`);
  return result;
}


// ==========================================
// 📌 ماژول ۷: داشبورد مدیریت (Admin Panel UI)
// ==========================================

function renderLoginPage(errorMsg = "") {
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

function renderDashboardLayout(settings, activeTab, contentHtml) {
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
<p style="margin-top:6px;font-size:.85rem;opacity:.8">نسخه ۴.۰ | داینامیک و قابل مدیریت</p>
</div>
<div class="tabs">${tabsHtml}</div>
${contentHtml}
</div></body></html>`;
}

function renderGeneralTab(settings, message = "") {
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

function renderSymbolsTab(settings, message = "") {
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

function getSourceName(type) {
  const names = { tgju: "TGJU", nobitex: "نوبیتکس", emofid: "ایموفید", custom: "سفارشی" };
  return names[type] || type;
}

function renderSymbolEditForm(settings, symbol, index, message = "") {
  const isNew = index === "new";
  const msgHtml = message ? `<div class="msg msg-success">${message}</div>` : "";
  const s = symbol || { id: "", name: "", emoji: "📌", source_type: "tgju", source_slug: "", label: "نرخ فعلی", is_rial: true, min: 0, max: 999999999, enabled: true };

  return `
<div class="card">
<h3>${isNew ? "➕ افزودن نماد جدید" : "✏️ ویرایش نماد: " + s.name}</h3>
${msgHtml}
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

function renderScheduleTab(settings, message = "") {
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

function renderContentTab(settings, message = "") {
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


// ==========================================
// 📌 ماژول ۸: هسته اصلی ورکر (Worker Entrypoint)
// ==========================================

export default {

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const botToken = env.BOT_TOKEN;
    if (!botToken) {
      return new Response("⚠️ BOT_TOKEN Secret تنظیم نشده است.", { status: 500 });
    }

    // بارگذاری تنظیمات از KV
    const settings = await getSettings(env);
    const adminPassword = env.ADMIN_PASSWORD;

    // ── بررسی احراز هویت برای مسیرهای مدیریتی ──
    const isAdminPath = url.pathname.startsWith("/admin") || url.pathname === "/";
    if (isAdminPath && url.pathname !== "/logout") {
      if (!adminPassword) {
        return new Response(renderLoginPage("⚠️ رمز عبور تنظیم نشده."), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }

      // ورود با رمز عبور
      if (request.method === "POST" && url.pathname === "/admin") {
        const formData = await request.formData();
        if (formData.get("password") === adminPassword) {
          const response = new Response(renderDashboardLayout(settings, "general", renderGeneralTab(settings)), {
            headers: { "Content-Type": "text/html; charset=utf-8" }
          });
          response.headers.set("Set-Cookie", "admin_auth=verified; Path=/; Max-Age=86400; HttpOnly; SameSite=Strict");
          return response;
        } else {
          return new Response(renderLoginPage("❌ رمز عبور اشتباه است!"), {
            headers: { "Content-Type": "text/html; charset=utf-8" }
          });
        }
      }

      // بررسی کوکی برای سایر مسیرهای مدیریتی
      const cookies = request.headers.get("Cookie") || "";
      if (!cookies.includes("admin_auth=verified")) {
        return new Response(renderLoginPage(), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
    }

    // ── مسیر: خروج ──
    if (url.pathname === "/logout") {
      const response = new Response(
        `<html dir="rtl"><body style="font-family:Tahoma;text-align:center;padding:50px"><p>✅ خارج شدید.</p><a href="/admin">بازگشت</a></body></html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
      response.headers.set("Set-Cookie", "admin_auth=; Path=/; Max-Age=0");
      return response;
    }

    // ── مسیر: داشبورد اصلی (تنظیمات عمومی) ──
    if (url.pathname === "/admin" || url.pathname === "/") {
      if (request.method === "POST") return new Response("OK"); // handled above
      return new Response(renderDashboardLayout(settings, "general", renderGeneralTab(settings)), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // ── مسیر: ذخیره تنظیمات عمومی ──
    if (url.pathname === "/admin/save-general" && request.method === "POST") {
      const formData = await request.formData();
      settings.channel_id = formData.get("channel_id") || settings.channel_id;
      settings.admin_id = formData.get("admin_id") || settings.admin_id;
      await saveSettings(env, settings);
      return new Response(renderDashboardLayout(settings, "general", renderGeneralTab(settings, "✅ تنظیمات با موفقیت ذخیره شد.")), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // ── مسیر: لیست نمادها ──
    if (url.pathname === "/admin/symbols") {
      return new Response(renderDashboardLayout(settings, "symbols", renderSymbolsTab(settings)), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // ── مسیر: فرم افزودن/ویرایش نماد ──
    if (url.pathname === "/admin/symbols/edit") {
      const index = url.searchParams.get("index");
      const symbol = index === "new" ? null : settings.symbols[Number(index)];
      return new Response(renderDashboardLayout(settings, "symbols", renderSymbolEditForm(settings, symbol, index)), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // ── مسیر: ذخیره نماد ──
    if (url.pathname === "/admin/symbols/save" && request.method === "POST") {
      const formData = await request.formData();
      const index = formData.get("index");
      const symbolData = {
        id: formData.get("id"),
        name: formData.get("name"),
        emoji: formData.get("emoji") || "📌",
        source_type: formData.get("source_type"),
        source_slug: formData.get("source_slug"),
        label: formData.get("label") || "",
        is_rial: formData.get("is_rial") === "true",
        min: Number(formData.get("min")) || 0,
        max: Number(formData.get("max")) || 999999999,
        enabled: formData.get("enabled") === "on"
      };

      if (index === "new") {
        settings.symbols.push(symbolData);
      } else {
        settings.symbols[Number(index)] = symbolData;
      }

      await saveSettings(env, settings);
      return new Response(renderDashboardLayout(settings, "symbols", renderSymbolsTab(settings, "✅ نماد با موفقیت ذخیره شد.")), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // ── مسیر: تغییر وضعیت نماد ──
    if (url.pathname === "/admin/symbols/toggle") {
      const index = Number(url.searchParams.get("index"));
      settings.symbols[index].enabled = !settings.symbols[index].enabled;
      await saveSettings(env, settings);
      return Response.redirect(url.origin + "/admin/symbols", 302);
    }

    // ── مسیر: حذف نماد ──
    if (url.pathname === "/admin/symbols/delete") {
      const index = Number(url.searchParams.get("index"));
      settings.symbols.splice(index, 1);
      await saveSettings(env, settings);
      return Response.redirect(url.origin + "/admin/symbols", 302);
    }

    // ── مسیر: لیست زمان‌بندی ──
    if (url.pathname === "/admin/schedule") {
      return new Response(renderDashboardLayout(settings, "schedule", renderScheduleTab(settings)), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // ── مسیر: افزودن زمان جدید ──
    if (url.pathname === "/admin/schedule/add" && request.method === "POST") {
      const formData = await request.formData();
      const time = formData.get("time");
      if (time) {
        settings.schedules.push({
          id: "sch_" + Date.now(),
          time: time,
          enabled: true
        });
        await saveSettings(env, settings);
      }
      return Response.redirect(url.origin + "/admin/schedule", 302);
    }

    // ── مسیر: تغییر وضعیت زمان ──
    if (url.pathname === "/admin/schedule/toggle") {
      const index = Number(url.searchParams.get("index"));
      settings.schedules[index].enabled = !settings.schedules[index].enabled;
      await saveSettings(env, settings);
      return Response.redirect(url.origin + "/admin/schedule", 302);
    }

    // ── مسیر: حذف زمان ──
    if (url.pathname === "/admin/schedule/delete") {
      const index = Number(url.searchParams.get("index"));
      settings.schedules.splice(index, 1);
      await saveSettings(env, settings);
      return Response.redirect(url.origin + "/admin/schedule", 302);
    }

    // ── مسیر: محتوای پست ──
    if (url.pathname === "/admin/content") {
      return new Response(renderDashboardLayout(settings, "content", renderContentTab(settings)), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // ── مسیر: ذخیره محتوا ──
    if (url.pathname === "/admin/content/save" && request.method === "POST") {
      const formData = await request.formData();
      settings.caption_template = formData.get("caption_template") || settings.caption_template;
      settings.photo_url = formData.get("photo_url") || settings.photo_url;
      await saveSettings(env, settings);
      return new Response(renderDashboardLayout(settings, "content", renderContentTab(settings, "✅ محتوا با موفقیت ذخیره شد.")), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // ── مسیر: پیش‌نمایش پست ──
    if (url.pathname === "/preview") {
      try {
        const priceResults = await fetchAllPrices(settings);
        const caption = await generateCaption(settings, priceResults);
        return new Response(`
<html dir="rtl"><head><meta charset="UTF-8"><style>body{font-family:Tahoma;padding:2rem;max-width:600px;margin:0 auto}pre{background:#f5f5f5;padding:1rem;border-radius:8px;white-space:pre-wrap}</style></head>
<body><h2>👁 پیش‌نمایش کپشن</h2><pre>${caption}</pre><a href="/admin/content">بازگشت</a></body></html>`,
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      } catch (error) {
        return new Response(`خطا در پیش‌نمایش: ${error.message}`, { status: 500 });
      }
    }

    // ── مسیر: ارسال دستی به کانال ──
    if (url.pathname === "/send") {
      try {
        await sendPostToChannel(botToken, settings);
        return new Response(
          JSON.stringify({ ok: true, message: "پست با موفقیت ارسال شد." }, null, 2),
          { headers: { "Content-Type": "application/json; charset=utf-8" } }
        );
      } catch (error) {
        await sendErrorToAdmin(botToken, settings.admin_id, error.message, "ارسال دستی (/send)");
        return new Response(
          JSON.stringify({ ok: false, error: error.message }, null, 2),
          { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
        );
      }
    }

    // ── مسیر: تست قیمت‌ها ──
    if (url.pathname === "/test-api") {
      try {
        const priceResults = await fetchAllPrices(settings);
        const data = {};
        priceResults.forEach(r => { data[r.symbol.id] = r.price; });
        return new Response(
          JSON.stringify({ ok: true, data }, null, 2),
          { headers: { "Content-Type": "application/json; charset=utf-8" } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }, null, 2),
          { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
        );
      }
    }

    // ── مسیر: Webhook تلگرام ──
    if (request.method === "POST") {
      try {
        const update = await request.json();
        let chatId = null, text = null, callbackId = null;

        if (update.message) {
          chatId = update.message.chat.id;
          text = update.message.text;
        } else if (update.callback_query) {
          chatId = update.callback_query.message.chat.id;
          text = update.callback_query.data;
          callbackId = update.callback_query.id;
        }

        if (callbackId) {
          await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callback_query_id: callbackId, text: "⏳ در حال پردازش..." })
          });
        }

        if (chatId && (text === "/start" || text === "/send")) {
          if (String(chatId) !== String(settings.admin_id)) {
            await sendTelegramMessage(botToken, chatId, "⛔ دسترسی غیرمجاز.");
            return new Response("OK", { status: 200 });
          }

          if (text === "/start") {
            const msg = `سلام! 👋\nربات قیمت‌دهی فعال است.\nکانال: ${settings.channel_id}\n\nبرای ارسال فوری دکمه زیر را بزنید:`;
            await sendTelegramMessage(botToken, chatId, msg, {
              reply_markup: {
                inline_keyboard: [[{ text: "📤 ارسال هم‌اکنون", callback_data: "/send" }]]
              }
            });
          } else if (text === "/send") {
            await sendTelegramMessage(botToken, chatId, "⏳ در حال دریافت و ارسال...");
            try {
              await sendPostToChannel(botToken, settings);
              await sendTelegramMessage(botToken, chatId, "✅ ارسال شد!");
            } catch (error) {
              await sendTelegramMessage(botToken, chatId, `❌ خطا: ${error.message}`);
              await sendErrorToAdmin(botToken, settings.admin_id, error.message, "دستور تلگرام /send");
            }
          }
        }

        return new Response("OK", { status: 200 });
      } catch (error) {
        console.error("WEBHOOK ERROR:", error.message);
        return new Response("Error", { status: 500 });
      }
    }

    // ── مسیر پیش‌فرض ──
    return new Response(
      `🤖 ربات قیمت‌دهی فعال است.\nکانال: ${settings.channel_id}\n\nبرای مدیریت: /admin`,
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  },


  // ────────────────────────────────────────
  // Cron Handler (هر ۱۰ دقیقه)
  // ────────────────────────────────────────
  async scheduled(event, env, ctx) {
    try {
      const botToken = env.BOT_TOKEN;
      if (!botToken) return;

      const settings = await getSettings(env);
      const now = new Date();

      // ساعت فعلی به وقت تهران
      const tehranNow = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Tehran",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).format(now);

      const currentHour = Number(tehranNow.split(":")[0]);
      const currentMinute = Number(tehranNow.split(":")[1]);

      // خواندن لاگ ارسال‌های امروز
      const sentLog = await getSentLog(env);

      // بررسی هر زمان فعال
      for (const schedule of settings.schedules) {
        if (!schedule.enabled) continue;

        const [schHour, schMinute] = schedule.time.split(":").map(Number);

        // اگر در بازه ۱۰ دقیقه‌ای این زمان هستیم و هنوز ارسال نشده
        const minuteDiff = (currentHour * 60 + currentMinute) - (schHour * 60 + schMinute);

        if (minuteDiff >= 0 && minuteDiff < 10 && !sentLog.includes(schedule.time)) {
          console.log(`CRON: Sending for schedule ${schedule.time}`);
          await sendPostToChannel(botToken, settings);
          await addSentLog(env, schedule.time);
          console.log(`CRON: Sent successfully for ${schedule.time}`);
        }
      }
    } catch (error) {
      console.error("CRON ERROR:", error.message);
      const settings = await getSettings(env);
      await sendErrorToAdmin(env.BOT_TOKEN, settings.admin_id, error.message, "Cron Job (ارسال خودکار)");
    }
  }
};
