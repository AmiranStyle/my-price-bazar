// ==========================================
// 📌 ماژول ۱: تنظیمات و پیکربندی (Configuration)
// ==========================================
const CONFIG = {
  tgjuHeaders: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache"
  },
  adminId: null, // از env.ADMIN_USER_ID پر می‌شود
  channelId: null, // از env.DEFAULT_CHANNEL_ID پر می‌شود
  botToken: null, // از env.BOT_TOKEN پر می‌شود
  photoUrl: null
};

// ==========================================
// 📌 ماژول ۲: ابزارهای عمومی و تبدیل داده (Utilities)
// ==========================================
function toEngDigits(str) {
  if (!str) return "";
  return String(str)
    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

function parseNumber(value) {
  if (!value) return null;
  const normalized = toEngDigits(String(value)).replace(/[,\u066C\s]/g, "").trim();
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

function getTehranDateTime(overrideTime = null) {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran", weekday: "long", day: "numeric", month: "long", year: "numeric"
  }).format(now);
  
  const timeStr = overrideTime || new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hour12: false
  }).format(now);

  return { dateStr, timeStr };
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

function extractNumberAfterLabel(text, label, maxChars = 100) {
  if (!text || !label) return null;
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escapedLabel}\\s*[:：]?\\s*([0-9۰-۹٠-٩][0-9۰-۹٠-٩,٬\\. ]{0,${maxChars}})`, "i");
  const match = text.match(pattern);
  if (!match || !match[1]) return null;
  const numberMatch = match[1].match(/[0-9۰-۹٠-٩][0-9۰-۹٠-٩,٬]*/);
  return numberMatch ? parseNumber(numberMatch[0]) : null;
}

// ==========================================
// 📌 ماژول ۳: هسته دریافت قیمت‌ها (Price Core)
// ==========================================
async function fetchTgjuPage(slug) {
  const response = await fetch(`https://www.tgju.org/profile/${slug}`, {
    method: "GET", headers: CONFIG.tgjuHeaders
  });
  if (!response.ok) throw new Error(`TGJU HTTP ${response.status} برای ${slug}`);
  return await response.text();
}

async function getGold18kPrice() {
  try {
    const html = await fetchTgjuPage("geram18");
    const text = htmlToText(html);
    // تلاش برای پیدا کردن با لیبل‌های مختلف
    let rialPrice = extractNumberAfterLabel(text, "نرخ فعلی", 80) || 
                    extractNumberAfterLabel(text, "قیمت", 80);
    if (!rialPrice) throw new Error("نرخ طلای ۱۸ پیدا نشد.");
    
    const tomanPrice = rialToToman(rialPrice);
    if (tomanPrice < 1000000 || tomanPrice > 150000000) throw new Error(`قیمت طلای ۱۸ غیرمنطقی است: ${tomanPrice}`);
    return tomanPrice;
  } catch (error) {
    console.error("GOLD ERROR:", error.message);
    return null;
  }
}

async function getTetherPrice() {
  try {
    // اولویت با Nobitex API است چون پایدارتر از اسکرپینگ TGJU است
    const response = await fetch("https://api.nobitex.ir/v2/orderbook/USDTIRT", {
      method: "GET", headers: { "Accept": "application/json" }
    });
    if (!response.ok) throw new Error(`Nobitex HTTP ${response.status}`);
    const data = await response.json();
    const tomanPrice = rialToToman(data?.lastTradePrice);
    if (!tomanPrice || tomanPrice < 20000 || tomanPrice > 500000) throw new Error("قیمت تتر نامعتبر است.");
    return tomanPrice;
  } catch (error) {
    console.error("USDT NOBITEX ERROR, Fallback to TGJU:", error.message);
    try {
      const html = await fetchTgjuPage("crypto-tether");
      const text = htmlToText(html);
      const rialPrice = extractNumberAfterLabel(text, "قیمت ریالی", 80);
      const tomanPrice = rialToToman(rialPrice);
      if (!tomanPrice || tomanPrice < 20000 || tomanPrice > 500000) throw new Error("قیمت تتر TGJU نامعتبر است.");
      return tomanPrice;
    } catch (tgjuError) {
      console.error("USDT TGJU ERROR:", tgjuError.message);
      return null;
    }
  }
}

async function getAyarPrice() {
  try {
    // تلاش اول: TGJU با اسلاگ دقیق صندوق عیار
    const html = await fetchTgjuPage("ime_fund_ayar");
    const text = htmlToText(html);
    let rialPrice = extractNumberAfterLabel(text, "نرخ فعلی", 100) || 
                    extractNumberAfterLabel(text, "قیمت پایانی", 100) ||
                    extractNumberAfterLabel(text, "آخرین معامله", 100);
    
    if (!rialPrice) throw new Error("قیمت عیار در TGJU پیدا نشد.");
    
    const tomanPrice = rialToToman(rialPrice);
    if (!tomanPrice || tomanPrice < 10000 || tomanPrice > 500000) throw new Error(`قیمت عیار غیرمنطقی است: ${tomanPrice}`);
    return tomanPrice;
  } catch (error) {
    console.error("AYAR ERROR:", error.message);
    return null; // در صورت خطا، null برمی‌گرداند تا در اعتبارسنجی مشخص شود
  }
}

async function fetchAllPrices() {
  const [goldPrice, usdtPrice, ayarPrice] = await Promise.all([
    getGold18kPrice(), getTetherPrice(), getAyarPrice()
  ]);
  return { goldPrice, usdtPrice, ayarPrice };
}

// ==========================================
// 📌 ماژول ۴: ارتباطات و تلگرام (Telegram & Alerts)
// ==========================================
async function sendTelegramMessage(chatId, text, extra = {}) {
  if (!CONFIG.botToken) throw new Error("BOT_TOKEN تنظیم نشده است.");
  const response = await fetch(`https://api.telegram.org/bot${CONFIG.botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "HTML", ...extra })
  });
  return await response.json();
}

async function sendErrorToAdmin(errorMsg, context = "نامشخص") {
  if (!CONFIG.adminId) return;
  const message = `🚨 <b>خطای بحرانی در سیستم قیمت‌دهی</b>\n\n📌 بخش: ${context}\n⚠️ جزئیات:\n<code>${errorMsg}</code>\n⏰ زمان: ${new Date().toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })}`;
  await sendTelegramMessage(CONFIG.adminId, message);
}

async function generateCaption() {
  const prices = await fetchAllPrices();
  const errors = [];
  if (!prices.goldPrice) errors.push("طلای ۱۸ عیار");
  if (!prices.usdtPrice) errors.push("تتر (USDT)");
  if (!prices.ayarPrice) errors.push("صندوق عیار");

  if (errors.length > 0) {
    throw new Error(`عدم موفقیت در دریافت قیمت: ${errors.join("، ")}`);
  }

  const { dateStr, timeStr } = getTehranDateTime();
  return `📊 <b>قیمت‌های لحظه‌ای بازار</b>
🗓 ${dateStr} | ساعت ${timeStr}

🔸 <b>طلای ۱۸ عیار:</b> ${formatFa(prices.goldPrice)} تومان
🔹 <b>صندوق عیار:</b> ${formatFa(prices.ayarPrice)} تومان
🟢 <b>تتر (USDT):</b> ${formatFa(prices.usdtPrice)} تومان

#قیمت_طلا #تتر #صندوق_عیار #تحلیل_بازار
🆔 ${CONFIG.channelId}`;
}

async function sendPostToChannel(overrideTime = null) {
  const caption = await generateCaption();
  const payload = { chat_id: CONFIG.channelId, photo: CONFIG.photoUrl, caption: caption };
  const response = await fetch(`https://api.telegram.org/bot${CONFIG.botToken}/sendPhoto`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!result.ok) throw new Error(`Telegram API Error: ${result.description}`);
  return result;
}

// ==========================================
// 📌 ماژول ۵: رابط کاربری داشبورد (Dashboard UI)
// ==========================================
function renderAdminPanel(isAuthenticated, env) {
  if (!isAuthenticated) {
    return `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>ورود به پنل</title>
    <style>body{font-family:Tahoma,sans-serif;background:#f4f4f9;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}
    .card{background:#fff;padding:2rem;border-radius:10px;box-shadow:0 4px 6px rgba(0,0,0,0.1);text-align:center;}
    input{padding:10px;margin:10px 0;width:200px;border:1px solid #ccc;border-radius:5px;}
    button{padding:10px 20px;background:#007bff;color:#fff;border:none;border-radius:5px;cursor:pointer;}
    </style></head><body><div class="card"><h2>🔐 ورود به داشبورد مدیریت</h2>
    <form method="POST" action="/admin"><input type="password" name="password" placeholder="رمز عبور" required><br>
    <button type="submit">ورود</button></form></div></body></html>`;
  }

  return `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>داشبورد مدیریت</title>
  <style>body{font-family:Tahoma,sans-serif;background:#f4f4f9;padding:2rem;}
  .container{max-width:800px;margin:0 auto;background:#fff;padding:2rem;border-radius:10px;box-shadow:0 4px 6px rgba(0,0,0,0.1);}
  .btn{display:inline-block;padding:10px 20px;margin:5px;background:#28a745;color:#fff;text-decoration:none;border-radius:5px;}
  .btn-danger{background:#dc3545;} .info{background:#e9ecef;padding:1rem;border-radius:5px;margin:1rem 0;}
  </style></head><body><div class="container">
  <h2>📊 داشبورد مدیریت ربات قیمت</h2>
  <div class="info">
    <p><b>کانال هدف:</b> ${CONFIG.channelId}</p>
    <p><b>آیدی مدیر:</b> ${CONFIG.adminId}</p>
    <p><b>وضعیت کرون:</b> فعال (ساعت ۱۵:۳۰ UTC معادل ۱۹:۰۰ تهران)</p>
  </div>
  <h3>عملیات سریع:</h3>
  <a href="/send" class="btn">📤 ارسال دستی قیمت به کانال</a>
  <a href="/test-api" class="btn" style="background:#17a2b8;">🧪 تست دریافت قیمت‌ها</a>
  <a href="/logout" class="btn btn-danger">🚪 خروج</a>
  </div></body></html>`;
}

// ==========================================
// 📌 ماژول ۶: هسته اصلی ورکر (Worker Entrypoint)
// ==========================================
export default {
  async fetch(request, env, ctx) {
    // بارگذاری تنظیمات از محیط
    CONFIG.botToken = env.BOT_TOKEN;
    CONFIG.channelId = env.DEFAULT_CHANNEL_ID || "@PulseHub_co";
    CONFIG.adminId = env.ADMIN_USER_ID || "165944913";
    CONFIG.photoUrl = env.PHOTO_URL;
    const adminPassword = env.ADMIN_PASSWORD || "AmiranAdmin2026";

    const url = new URL(request.url);

    // ۱. مسیر داشبورد مدیریت
    if (url.pathname === "/admin" || url.pathname === "/") {
      if (request.method === "POST") {
        const formData = await request.formData();
        if (formData.get("password") === adminPassword) {
          const response = new Response(renderAdminPanel(true, env), { headers: { "Content-Type": "text/html; charset=utf-8" } });
          response.headers.set("Set-Cookie", `admin_auth=true; Path=/; Max-Age=86400; HttpOnly`);
          return response;
        } else {
          return new Response(renderAdminPanel(false, env) + "<p style='color:red;text-align:center;'>رمز عبور اشتباه است!</p>", { headers: { "Content-Type": "text/html; charset=utf-8" } });
        }
      }
      // بررسی کوکی برای احراز هویت
      const cookies = request.headers.get("Cookie") || "";
      const isAuthenticated = cookies.includes("admin_auth=true");
      return new Response(renderAdminPanel(isAuthenticated, env), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (url.pathname === "/logout") {
      const response = new Response("خروج موفقیت‌آمیز بود. <a href='/admin'>بازگشت</a>", { headers: { "Content-Type": "text/html; charset=utf-8" } });
      response.headers.set("Set-Cookie", `admin_auth=; Path=/; Max-Age=0`);
      return response;
    }

    // ۲. مسیر ارسال دستی (محافظت شده با یک توکن ساده یا فقط از طریق داشبورد فراخوانی می‌شود)
    if (url.pathname === "/send") {
      try {
        await sendPostToChannel();
        return new Response(JSON.stringify({ ok: true, message: "پست با موفقیت ارسال شد." }), { headers: { "Content-Type": "application/json; charset=utf-8" } });
      } catch (error) {
        await sendErrorToAdmin(error.message, "ارسال دستی (/send)");
        return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } });
      }
    }

    // ۳. مسیر تست API (برای دیباگ کردن قیمت‌ها)
    if (url.pathname === "/test-api") {
      try {
        const prices = await fetchAllPrices();
        return new Response(JSON.stringify({ ok: true, data: prices }, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8" } });
      } catch (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } });
      }
    }

    // ۴. مدیریت Webhook تلگرام (برای دکمه‌های شیشه‌ای و دستورات ربات)
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

        if (callbackId) {
          await fetch(`https://api.telegram.org/bot${CONFIG.botToken}/answerCallbackQuery`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callback_query_id: callbackId, text: "⏳ در حال پردازش..." })
          });
        }

        if (chatId && (text === "/start" || text === "/send")) {
          // بررسی امنیت: فقط ادمین می‌تواند دستور ارسال دهد
          if (String(chatId) !== String(CONFIG.adminId)) {
            await sendTelegramMessage(chatId, "⛔ شما مجاز به استفاده از این دستور نیستید.");
            return new Response("OK", { status: 200 });
          }

          await sendTelegramMessage(chatId, "⏳ در حال دریافت قیمت‌ها و ارسال به کانال...");
          try {
            await sendPostToChannel();
            await sendTelegramMessage(chatId, "✅ پست با موفقیت در کانال منتشر شد!");
          } catch (error) {
            await sendTelegramMessage(chatId, `❌ خطا در ارسال:\n${error.message}`);
            await sendErrorToAdmin(error.message, "دستور تلگرام /send");
          }
        }

        return new Response("OK", { status: 200 });
      } catch (error) {
        console.error("WEBHOOK ERROR:", error.message);
        return new Response("Error", { status: 500 });
      }
    }

    return new Response("ربات فعال است 🚀\nبرای مدیریت به مسیر /admin بروید.", { status: 200 });
  },

  // ========================================
  // ۵. کرون‌جاب (زمان‌بندی خودکار)
  // ========================================
  async scheduled(event, env, ctx) {
    try {
      CONFIG.botToken = env.BOT_TOKEN;
      CONFIG.channelId = env.DEFAULT_CHANNEL_ID || "@PulseHub_co";
      CONFIG.adminId = env.ADMIN_USER_ID || "165944913";
      CONFIG.photoUrl = env.PHOTO_URL;

      console.log("CRON STARTED: Sending prices to channel...");
      await sendPostToChannel("۱۹:۰۰");
      console.log("CRON SUCCESS");
    } catch (error) {
      console.error("CRON ERROR:", error.message);
      // ارسال هشدار فوری به پی‌وی شما در صورت شکست کرون
      await sendErrorToAdmin(error.message, "Cron Job (زمان‌بندی خودکار)");
    }
  }
};
