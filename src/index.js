// ==========================================
// 📌 ربات قیمت‌دهی روزانه بازار - ورژن ۳.۱
// ماژولار | خودترمیم | همراه با داشبورد مدیریت
// ==========================================


// ==========================================
// 📌 ماژول ۱: ابزارهای عمومی (Utilities)
// ==========================================

// تبدیل اعداد فارسی/عربی به انگلیسی
function toEngDigits(str) {
  if (!str) return "";
  return String(str)
    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

// تبدیل رشته به عدد معتبر
function parseNumber(value) {
  if (!value) return null;
  const normalized = toEngDigits(String(value))
    .replace(/[,\u066C\u066B\s]/g, "")
    .trim();
  const num = Number(normalized);
  return Number.isFinite(num) && num > 0 ? num : null;
}

// فرمت‌دهی عدد با جداکننده فارسی
function formatFa(num) {
  if (!Number.isFinite(Number(num))) return "نامشخص";
  return Number(num).toLocaleString("fa-IR");
}

// تبدیل ریال به تومان
function rialToToman(rial) {
  const value = parseNumber(rial);
  return value ? Math.round(value / 10) : null;
}

// دریافت تاریخ و ساعت تهران
function getTehranDateTime(overrideTime = null) {
  const now = new Date();

  const dateStr = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(now);

  const timeStr = overrideTime || new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(now);

  return { dateStr, timeStr };
}

// تبدیل HTML به متن ساده
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

// استخراج عدد بعد از یک لیبل مشخص
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
// 📌 ماژول ۳: هسته دریافت قیمت‌ها (Price Core)
// ==========================================

// دریافت صفحه از TGJU
async function fetchTgjuPage(slug) {
  const response = await fetch(`https://www.tgju.org/profile/${slug}`, {
    method: "GET",
    headers: BROWSER_HEADERS
  });
  if (!response.ok) {
    throw new Error(`TGJU HTTP ${response.status} برای ${slug}`);
  }
  return await response.text();
}

// ────────────────────────────────────────
// ۱. طلای ۱۸ عیار (منبع: TGJU)
// ────────────────────────────────────────
async function getGold18kPrice() {
  try {
    const html = await fetchTgjuPage("geram18");
    const text = htmlToText(html);

    const rialPrice =
      extractNumberAfterLabel(text, "نرخ فعلی", 80) ||
      extractNumberAfterLabel(text, "قیمت", 80);

    if (!rialPrice) throw new Error("نرخ طلای ۱۸ پیدا نشد.");

    const tomanPrice = rialToToman(rialPrice);

    // اعتبارسنجی: قیمت طلای ۱۸ باید بین ۱ میلیون تا ۱۵۰ میلیون تومان باشد
    if (!tomanPrice || tomanPrice < 1000000 || tomanPrice > 150000000) {
      throw new Error(`قیمت طلای ۱۸ غیرمنطقی: ${tomanPrice}`);
    }

    console.log(`GOLD 18K | ${rialPrice} Rial → ${tomanPrice} Toman`);
    return tomanPrice;
  } catch (error) {
    console.error("GOLD ERROR:", error.message);
    return null;
  }
}

// ────────────────────────────────────────
// ۲. تتر (منبع اصلی: Nobitex API | پشتیبان: TGJU)
// ────────────────────────────────────────
async function getTetherPrice() {
  // تلاش اول: Nobitex API (پایدارترین منبع)
  try {
    const response = await fetch("https://api.nobitex.ir/v2/orderbook/USDTIRT", {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) throw new Error(`Nobitex HTTP ${response.status}`);

    const data = await response.json();
    const tomanPrice = rialToToman(data?.lastTradePrice);

    if (!tomanPrice || tomanPrice < 20000 || tomanPrice > 500000) {
      throw new Error(`قیمت تتر Nobitex غیرمنطقی: ${tomanPrice}`);
    }

    console.log(`USDT NOBITEX | ${tomanPrice} Toman`);
    return tomanPrice;
  } catch (error) {
    console.error("USDT NOBITEX ERROR:", error.message);
  }

  // تلاش دوم: TGJU (پشتیبان)
  try {
    const html = await fetchTgjuPage("crypto-tether");
    const text = htmlToText(html);
    const rialPrice = extractNumberAfterLabel(text, "قیمت ریالی", 80);
    const tomanPrice = rialToToman(rialPrice);

    if (!tomanPrice || tomanPrice < 20000 || tomanPrice > 500000) {
      throw new Error(`قیمت تتر TGJU غیرمنطقی: ${tomanPrice}`);
    }

    console.log(`USDT TGJU | ${tomanPrice} Toman`);
    return tomanPrice;
  } catch (error) {
    console.error("USDT TGJU ERROR:", error.message);
    return null;
  }
}

// ────────────────────────────────────────
// ۳. صندوق عیار (منبع اصلی: TGJU/gc3 | پشتیبان: Emofid)
// ⚠️ نکته: صفحه ime_fund_ayar در TGJU غیرفعال شده!
//    صفحه صحیح: gc3
// ────────────────────────────────────────
async function getAyarPriceFromTGJU() {
  try {
    // gc3 = صفحه فعال صندوق طلای عیار در TGJU
    const html = await fetchTgjuPage("gc3");
    const text = htmlToText(html);

    const rialPrice =
      extractNumberAfterLabel(text, "نرخ فعلی", 100) ||
      extractNumberAfterLabel(text, "قیمت پایانی", 100) ||
      extractNumberAfterLabel(text, "آخرین معامله", 100);

    if (!rialPrice) throw new Error("قیمت عیار در TGJU/gc3 پیدا نشد.");

    const tomanPrice = rialToToman(rialPrice);

    // اعتبارسنجی: عیار باید بین ۱۰,۰۰۰ تا ۵۰۰,۰۰۰ تومان باشد
    if (!tomanPrice || tomanPrice < 10000 || tomanPrice > 500000) {
      throw new Error(`قیمت عیار TGJU غیرمنطقی: ${tomanPrice}`);
    }

    console.log(`AYAR TGJU/gc3 | ${rialPrice} Rial → ${tomanPrice} Toman`);
    return tomanPrice;
  } catch (error) {
    console.error("AYAR TGJU ERROR:", error.message);
    return null;
  }
}

async function getAyarPriceFromEmofid() {
  try {
    const response = await fetch("https://www.emofid.com/funds/ayar/", {
      method: "GET",
      headers: BROWSER_HEADERS
    });
    if (!response.ok) throw new Error(`Emofid HTTP ${response.status}`);

    const html = await response.text();
    const text = htmlToText(html);

    // لیبل‌های صحیح در صفحه ایموفید
    const rialPrice =
      extractNumberAfterLabel(text, "قیمت هر واحد", 100) ||
      extractNumberAfterLabel(text, "آخرین قیمت", 100) ||
      extractNumberAfterLabel(text, "قیمت صدور", 100) ||
      extractNumberAfterLabel(text, "آخرین معامله", 100);

    if (!rialPrice) throw new Error("قیمت عیار در Emofid پیدا نشد.");

    const tomanPrice = rialToToman(rialPrice);

    if (!tomanPrice || tomanPrice < 10000 || tomanPrice > 500000) {
      throw new Error(`قیمت عیار Emofid غیرمنطقی: ${tomanPrice}`);
    }

    console.log(`AYAR EMOFID | ${rialPrice} Rial → ${tomanPrice} Toman`);
    return tomanPrice;
  } catch (error) {
    console.error("AYAR EMOFID ERROR:", error.message);
    return null;
  }
}

// تابع اصلی عیار: ابتدا TGJU/gc3، سپس Emofid
async function getAyarPrice() {
  const tgjuPrice = await getAyarPriceFromTGJU();
  if (tgjuPrice !== null) {
    console.log(`AYAR SOURCE = TGJU/gc3 | ${tgjuPrice} Toman`);
    return tgjuPrice;
  }

  console.log("AYAR TGJU FAILED → EMOFID FALLBACK");
  const emofidPrice = await getAyarPriceFromEmofid();
  if (emofidPrice !== null) {
    console.log(`AYAR SOURCE = EMOFID | ${emofidPrice} Toman`);
    return emofidPrice;
  }

  return null;
}

// دریافت همزمان همه قیمت‌ها
async function fetchAllPrices() {
  const [goldPrice, usdtPrice, ayarPrice] = await Promise.all([
    getGold18kPrice(),
    getTetherPrice(),
    getAyarPrice()
  ]);

  const result = { goldPrice, usdtPrice, ayarPrice };
  console.log("FINAL PRICES:", JSON.stringify(result));
  return result;
}


// ==========================================
// 📌 ماژول ۴: ارتباطات تلگرام (Telegram API)
// ==========================================

// ارسال پیام متنی
async function sendTelegramMessage(botToken, chatId, text, extra = {}) {
  if (!botToken) throw new Error("BOT_TOKEN تنظیم نشده است.");

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
        ...extra
      })
    }
  );
  return await response.json();
}

// ارسال هشدار خطا به پی‌وی مدیر
async function sendErrorToAdmin(botToken, adminId, errorMsg, context = "نامشخص") {
  if (!botToken || !adminId) return;

  const nowFa = new Date().toLocaleString("fa-IR", {
    timeZone: "Asia/Tehran",
    dateStyle: "full",
    timeStyle: "short"
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
// 📌 ماژول ۵: ساخت و ارسال پست (Post Generator)
// ==========================================

// ساخت متن کپشن با قیمت‌های لحظه‌ای
async function generateCaption(channelId, overrideTime = null) {
  const prices = await fetchAllPrices();

  const missing = [];
  if (!prices.goldPrice) missing.push("طلای ۱۸ عیار");
  if (!prices.usdtPrice) missing.push("تتر (USDT)");
  if (!prices.ayarPrice) missing.push("صندوق عیار");

  if (missing.length > 0) {
    throw new Error(`عدم موفقیت در دریافت: ${missing.join("، ")}`);
  }

  const { dateStr, timeStr } = getTehranDateTime(overrideTime);

  return (
    `📊 <b>قیمت‌های لحظه‌ای بازار</b>\n` +
    `🗓 ${dateStr} | ساعت ${timeStr}\n\n` +
    `🔸 <b>طلای ۱۸ عیار:</b> ${formatFa(prices.goldPrice)} تومان\n` +
    `🔹 <b>صندوق عیار:</b> ${formatFa(prices.ayarPrice)} تومان\n` +
    `🟢 <b>تتر (USDT):</b> ${formatFa(prices.usdtPrice)} تومان\n\n` +
    `#قیمت_طلا #تتر #صندوق_عیار #سرمایه_گذاری\n\n` +
    `🆔 ${channelId}`
  );
}

// ارسال عکس + کپشن به کانال
async function sendPostToChannel(botToken, channelId, photoUrl, overrideTime = null) {
  if (!botToken) throw new Error("BOT_TOKEN تنظیم نشده است.");

  const caption = await generateCaption(channelId, overrideTime);

  const payload = {
    chat_id: channelId,
    photo: photoUrl,
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

  if (!result.ok) {
    throw new Error(`Telegram API Error: ${result.description}`);
  }

  return result;
}


// ==========================================
// 📌 ماژول ۶: داشبورد مدیریت (Admin Panel UI)
// ==========================================

function renderLoginPage(errorMsg = "") {
  const errorHtml = errorMsg
    ? `<p style="color:#dc3545;text-align:center;margin-top:10px;">${errorMsg}</p>`
    : "";

  return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ورود به پنل مدیریت</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Tahoma, Arial, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh; color: #fff;
    }
    .card {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
      padding: 2.5rem; border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      text-align: center; width: 100%; max-width: 380px;
    }
    h2 { margin-bottom: 1.5rem; font-size: 1.3rem; }
    input {
      width: 100%; padding: 12px 16px; margin: 8px 0;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px; background: rgba(255,255,255,0.1);
      color: #fff; font-size: 1rem; outline: none;
    }
    input::placeholder { color: rgba(255,255,255,0.5); }
    input:focus { border-color: #4dabf7; }
    button {
      width: 100%; padding: 12px; margin-top: 12px;
      background: #4dabf7; color: #fff; border: none;
      border-radius: 8px; font-size: 1rem; cursor: pointer;
      transition: background 0.3s;
    }
    button:hover { background: #339af0; }
  </style>
</head>
<body>
  <div class="card">
    <h2>🔐 ورود به داشبورد مدیریت</h2>
    <form method="POST" action="/admin">
      <input type="password" name="password" placeholder="رمز عبور" required autofocus>
      <button type="submit">ورود</button>
    </form>
    ${errorHtml}
  </div>
</body>
</html>`;
}

function renderDashboard(channelId, adminId) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>داشبورد مدیریت ربات</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Tahoma, Arial, sans-serif;
      background: #f0f2f5; padding: 1.5rem; color: #333;
    }
    .container { max-width: 700px; margin: 0 auto; }
    .header {
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      color: #fff; padding: 1.5rem; border-radius: 12px;
      margin-bottom: 1.5rem; text-align: center;
    }
    .header h2 { font-size: 1.4rem; }
    .card {
      background: #fff; padding: 1.5rem; border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 1rem;
    }
    .card h3 { margin-bottom: 1rem; color: #16213e; }
    .info-row {
      display: flex; justify-content: space-between;
      padding: 8px 0; border-bottom: 1px solid #eee;
    }
    .info-row:last-child { border-bottom: none; }
    .btn {
      display: inline-block; padding: 12px 24px; margin: 6px;
      color: #fff; text-decoration: none; border-radius: 8px;
      font-size: 0.95rem; transition: opacity 0.3s;
    }
    .btn:hover { opacity: 0.85; }
    .btn-send { background: #28a745; }
    .btn-test { background: #17a2b8; }
    .btn-logout { background: #dc3545; }
    .status { padding: 8px 12px; border-radius: 6px; font-size: 0.9rem; }
    .status-ok { background: #d4edda; color: #155724; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>📊 داشبورد مدیریت ربات قیمت</h2>
      <p style="margin-top:8px;font-size:0.9rem;opacity:0.8;">نسخه ۳.۱ | ماژولار و حرفه‌ای</p>
    </div>

    <div class="card">
      <h3>⚙️ وضعیت سیستم</h3>
      <div class="info-row"><b>کانال هدف:</b> <span>${channelId}</span></div>
      <div class="info-row"><b>آیدی مدیر:</b> <span>${adminId}</span></div>
      <div class="info-row"><b>ارسال خودکار:</b> <span>ساعت ۱۹:۰۰ تهران (Cron: 30 15 UTC)</span></div>
      <div class="info-row"><b>وضعیت:</b> <span class="status status-ok">✅ فعال</span></div>
    </div>

    <div class="card">
      <h3>🚀 عملیات سریع</h3>
      <div style="text-align:center;">
        <a href="/send" class="btn btn-send">📤 ارسال دستی قیمت به کانال</a>
        <a href="/test-api" class="btn btn-test">🧪 تست دریافت قیمت‌ها</a>
        <a href="/logout" class="btn btn-logout">🚪 خروج</a>
      </div>
    </div>

    <div class="card">
      <h3>📋 راهنما</h3>
      <p style="font-size:0.9rem;line-height:1.8;">
        • <b>ارسال دستی:</b> قیمت‌ها را دریافت و فوراً به کانال ارسال می‌کند.<br>
        • <b>تست قیمت‌ها:</b> فقط قیمت‌ها را نمایش می‌دهد (بدون ارسال).<br>
        • <b>ارسال خودکار:</b> هر روز ساعت ۱۹:۰۰ از طریق Cron انجام می‌شود.<br>
        • <b>هشدار خطا:</b> در صورت بروز مشکل، به پی‌وی مدیر ارسال می‌شود.
      </p>
    </div>
  </div>
</body>
</html>`;
}


// ==========================================
// 📌 ماژول ۷: هسته اصلی ورکر (Worker Entrypoint)
// ==========================================

export default {

  // ────────────────────────────────────────
  // HTTP Handler
  // ────────────────────────────────────────
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // خواندن متغیرهای محیطی
    const botToken = env.BOT_TOKEN;
    const channelId = env.DEFAULT_CHANNEL_ID || "@PulseHub_co";
    const adminId = env.ADMIN_USER_ID || "165944913";
    const photoUrl = env.PHOTO_URL ||
      "https://i.postimg.cc/1t65gR2L/Chat-GPT-Image-Aug-14-2026-02-44-30-AM.png";
    const adminPassword = env.ADMIN_PASSWORD;

    // بررسی وجود توکن
    if (!botToken) {
      return new Response("⚠️ BOT_TOKEN Secret تنظیم نشده است.", { status: 500 });
    }

    // ── مسیر: داشبورد مدیریت ──
    if (url.pathname === "/admin" || url.pathname === "/") {

      // اگر رمز عبور تنظیم نشده باشد
      if (!adminPassword) {
        return new Response(
          renderLoginPage("⚠️ رمز عبور تنظیم نشده. لطفاً ADMIN_PASSWORD را در Secrets کلادفلر تنظیم کنید."),
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }

      // درخواست POST: بررسی رمز عبور
      if (request.method === "POST") {
        const formData = await request.formData();
        const submittedPassword = formData.get("password");

        if (submittedPassword === adminPassword) {
          const response = new Response(renderDashboard(channelId, adminId), {
            headers: { "Content-Type": "text/html; charset=utf-8" }
          });
          // کوکی احراز هویت (۲۴ ساعت اعتبار)
          response.headers.set(
            "Set-Cookie",
            `admin_auth=verified; Path=/; Max-Age=86400; HttpOnly; SameSite=Strict`
          );
          return response;
        } else {
          return new Response(renderLoginPage("❌ رمز عبور اشتباه است!"), {
            headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        }
      }

      // درخواست GET: بررسی کوکی
      const cookies = request.headers.get("Cookie") || "";
      const isAuthenticated = cookies.includes("admin_auth=verified");

      if (isAuthenticated) {
        return new Response(renderDashboard(channelId, adminId), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      } else {
        return new Response(renderLoginPage(), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
    }

    // ── مسیر: خروج از داشبورد ──
    if (url.pathname === "/logout") {
      const response = new Response(
        `<html dir="rtl"><body style="font-family:Tahoma;text-align:center;padding:50px;">
        <p>✅ با موفقیت خارج شدید.</p>
        <a href="/admin" style="color:#4dabf7;">بازگشت به صفحه ورود</a>
        </body></html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
      response.headers.set("Set-Cookie", "admin_auth=; Path=/; Max-Age=0");
      return response;
    }

    // ── مسیر: ارسال دستی به کانال ──
    if (url.pathname === "/send") {
      try {
        await sendPostToChannel(botToken, channelId, photoUrl);
        return new Response(
          JSON.stringify({ ok: true, message: "پست با موفقیت ارسال شد." }, null, 2),
          { headers: { "Content-Type": "application/json; charset=utf-8" } }
        );
      } catch (error) {
        await sendErrorToAdmin(botToken, adminId, error.message, "ارسال دستی (/send)");
        return new Response(
          JSON.stringify({ ok: false, error: error.message }, null, 2),
          { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
        );
      }
    }

    // ── مسیر: تست دریافت قیمت‌ها ──
    if (url.pathname === "/test-api") {
      try {
        const prices = await fetchAllPrices();
        return new Response(
          JSON.stringify({ ok: true, data: prices }, null, 2),
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

        let chatId = null;
        let text = null;
        let callbackId = null;

        if (update.message) {
          chatId = update.message.chat.id;
          text = update.message.text;
        } else if (update.callback_query) {
          chatId = update.callback_query.message.chat.id;
          text = update.callback_query.data;
          callbackId = update.callback_query.id;
        }

        // پاسخ به دکمه شیشه‌ای
        if (callbackId) {
          await fetch(
            `https://api.telegram.org/bot${botToken}/answerCallbackQuery`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: "⏳ در حال پردازش..."
              })
            }
          );
        }

        // دستور /start
        if (chatId && text === "/start") {
          // فقط مدیر مجاز است
          if (String(chatId) !== String(adminId)) {
            await sendTelegramMessage(botToken, chatId, "⛔ شما مجاز به استفاده از این ربات نیستید.");
            return new Response("OK", { status: 200 });
          }

          const msg =
            `سلام امیرحسین عزیز! 👋\n\n` +
            `ربات قیمت‌دهی فعال است.\n` +
            `کانال هدف: ${channelId}\n\n` +
            `برای ارسال فوری قیمت‌ها، دکمه زیر را بزنید:`;

          await sendTelegramMessage(botToken, chatId, msg, {
            reply_markup: {
              inline_keyboard: [
                [{ text: "📤 ارسال هم‌اکنون به کانال", callback_data: "/send" }]
              ]
            }
          });
        }

        // دستور /send (مستقیم یا از دکمه شیشه‌ای)
        else if (chatId && text === "/send") {
          // فقط مدیر مجاز است
          if (String(chatId) !== String(adminId)) {
            await sendTelegramMessage(botToken, chatId, "⛔ دسترسی غیرمجاز.");
            return new Response("OK", { status: 200 });
          }

          await sendTelegramMessage(botToken, chatId, "⏳ در حال دریافت قیمت‌ها و ارسال به کانال...");

          try {
            await sendPostToChannel(botToken, channelId, photoUrl);
            await sendTelegramMessage(botToken, chatId, "✅ پست با موفقیت در کانال منتشر شد!");
          } catch (error) {
            await sendTelegramMessage(botToken, chatId, `❌ خطا در ارسال:\n${error.message}`);
            await sendErrorToAdmin(botToken, adminId, error.message, "دستور تلگرام /send");
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
      `🤖 ربات قیمت‌دهی فعال است.\nکانال هدف: ${channelId}\n\nبرای مدیریت: /admin`,
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  },


  // ────────────────────────────────────────
  // Cron Handler (ارسال خودکار روزانه)
  // ────────────────────────────────────────
  async scheduled(event, env, ctx) {
    const botToken = env.BOT_TOKEN;
    const channelId = env.DEFAULT_CHANNEL_ID || "@PulseHub_co";
    const adminId = env.ADMIN_USER_ID || "165944913";
    const photoUrl = env.PHOTO_URL ||
      "https://i.postimg.cc/1t65gR2L/Chat-GPT-Image-Aug-14-2026-02-44-30-AM.png";

    try {
      console.log(`CRON STARTED → Sending to ${channelId}`);
      await sendPostToChannel(botToken, channelId, photoUrl, "۱۹:۰۰");
      console.log("CRON SUCCESS ✅");
    } catch (error) {
      console.error("CRON ERROR:", error.message);
      // ارسال فوری خطا به پی‌وی مدیر
      await sendErrorToAdmin(botToken, adminId, error.message, "Cron Job (ارسال خودکار ساعت ۱۹)");
    }
  }
};
