// ==========================================
// تنظیمات پیش‌فرض (در صورت نبود متغیر در کلادفلر)
// ==========================================

const DEFAULT_CHANNEL_ID = "@AmiranEducation";

const PHOTO_URL =
  "https://i.postimg.cc/1t65gR2L/Chat-GPT-Image-Aug-14-2026-02-44-30-AM.png";


// ==========================================
// ابزارهای عمومی
// ==========================================

function toEngDigits(str) {
  if (str === null || str === undefined) return "";

  return String(str)
    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}


function parseNumber(value) {
  if (value === null || value === undefined) return null;

  const normalized = toEngDigits(String(value))
    .replace(/[,\u066C]/g, "")
    .replace(/\s+/g, "")
    .trim();

  if (!normalized) return null;

  const num = Number(normalized);

  if (!Number.isFinite(num) || num <= 0) {
    return null;
  }

  return num;
}


function formatFa(num) {
  if (
    num === null ||
    num === undefined ||
    !Number.isFinite(Number(num))
  ) {
    return "نامشخص";
  }

  return Number(num).toLocaleString("fa-IR");
}


// ==========================================
// تبدیل ریال به تومان
// ==========================================

function rialToToman(rial) {
  const value = parseNumber(rial);

  if (value === null) {
    return null;
  }

  return Math.round(value / 10);
}


// ==========================================
// زمان تهران
// ==========================================

function getTehranDateTime(overrideTime = null) {
  const now = new Date();

  const dateFormatter = new Intl.DateTimeFormat(
    "fa-IR-u-ca-persian",
    {
      timeZone: "Asia/Tehran",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  );

  const parts = dateFormatter.formatToParts(now);

  let weekday = "";
  let day = "";
  let month = "";
  let year = "";

  for (const part of parts) {
    if (part.type === "weekday") weekday = part.value;
    if (part.type === "day") day = part.value;
    if (part.type === "month") month = part.value;
    if (part.type === "year") year = part.value;
  }

  const dateStr = `${weekday} ${day} ${month} ${year}`.trim();

  let timeStr = overrideTime;

  if (!timeStr) {
    const timeFormatter = new Intl.DateTimeFormat(
      "fa-IR",
      {
        timeZone: "Asia/Tehran",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }
    );

    timeStr = timeFormatter.format(now);
  }

  return {
    dateStr,
    timeStr
  };
}


// ==========================================
// Headers
// ==========================================

const TGJU_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache"
};

const EMOFID_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache"
};


// ==========================================
// تبدیل HTML به متن
// ==========================================

function htmlToText(html) {
  if (!html) return "";

  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/&comma;/gi, ",")
    .replace(/\s+/g, " ")
    .trim();
}


// ==========================================
// استخراج عدد بعد یک Label
// ==========================================

function extractNumberAfterLabel(text, label, maxChars = 100) {
  if (!text || !label) return null;

  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const pattern = new RegExp(
    escapedLabel +
      "\\s*[:：]?\\s*" +
      "([0-9۰-۹٠-٩][0-9۰-۹٠-٩,٬\\. ]{0," +
      maxChars +
      "})",
    "i"
  );

  const match = text.match(pattern);

  if (!match || !match[1]) {
    return null;
  }

  const numberMatch = match[1].match(/[0-9۰-۹٠-٩][0-9۰-۹٠-٩,٬]*/);

  if (!numberMatch) {
    return null;
  }

  return parseNumber(numberMatch[0]);
}


// ==========================================
// دریافت صفحه TGJU
// ==========================================

async function fetchTgjuPage(slug) {
  const response = await fetch(`https://www.tgju.org/profile/${slug}`, {
    method: "GET",
    headers: TGJU_HEADERS
  });

  if (!response.ok) {
    throw new Error(`TGJU HTTP ${response.status} برای ${slug}`);
  }

  return await response.text();
}


// ==========================================
// ۱. طلای ۱۸ عیار
// ==========================================

async function getGold18kPrice() {
  try {
    const html = await fetchTgjuPage("geram18");
    const text = htmlToText(html);

    const rialPrice = extractNumberAfterLabel(text, "نرخ فعلی", 80);

    if (rialPrice === null) {
      throw new Error("نرخ فعلی طلای ۱۸ پیدا نشد.");
    }

    const tomanPrice = rialToToman(rialPrice);

    if (tomanPrice === null) {
      throw new Error("تبدیل طلای ۱۸ نامعتبر بود.");
    }

    if (tomanPrice < 1000000 || tomanPrice > 100000000) {
      throw new Error(`قیمت طلای ۱۸ غیرمنطقی است: ${tomanPrice}`);
    }

    console.log(`GOLD | ${rialPrice} Rial -> ${tomanPrice} Toman`);
    return tomanPrice;
  } catch (error) {
    console.error("GOLD ERROR:", error.message);
    return null;
  }
}


// ==========================================
// ۲. تتر از TGJU
// ==========================================

async function getTetherPriceFromTGJU() {
  try {
    const html = await fetchTgjuPage("crypto-tether");
    const text = htmlToText(html);

    const rialPrice = extractNumberAfterLabel(text, "قیمت ریالی", 80);

    if (rialPrice === null) {
      throw new Error("قیمت ریالی تتر پیدا نشد.");
    }

    const tomanPrice = rialToToman(rialPrice);

    if (tomanPrice === null) {
      throw new Error("تبدیل تتر نامعتبر بود.");
    }

    if (tomanPrice < 20000 || tomanPrice > 500000) {
      throw new Error(`قیمت تتر غیرمنطقی است: ${tomanPrice}`);
    }

    console.log(`USDT TGJU | ${rialPrice} Rial -> ${tomanPrice} Toman`);
    return tomanPrice;
  } catch (error) {
    console.error("USDT TGJU ERROR:", error.message);
    return null;
  }
}


// ==========================================
// ۳. Fallback تتر از Nobitex
// ==========================================

async function getTetherPriceFromNobitex() {
  try {
    const response = await fetch("https://api.nobitex.ir/v2/orderbook/USDTIRT", {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Nobitex HTTP ${response.status}`);
    }

    const data = await response.json();
    const rialPrice = parseNumber(data?.lastTradePrice);

    if (rialPrice === null) {
      throw new Error("lastTradePrice پیدا نشد.");
    }

    const tomanPrice = rialToToman(rialPrice);

    if (tomanPrice === null) {
      throw new Error("تبدیل قیمت Nobitex نامعتبر بود.");
    }

    if (tomanPrice < 20000 || tomanPrice > 500000) {
      throw new Error(`قیمت Nobitex غیرمنطقی است: ${tomanPrice}`);
    }

    console.log(`USDT Nobitex | ${rialPrice} Rial -> ${tomanPrice} Toman`);
    return tomanPrice;
  } catch (error) {
    console.error("USDT NOBITEX ERROR:", error.message);
    return null;
  }
}


async function getTetherPrice() {
  const tgjuPrice = await getTetherPriceFromTGJU();
  if (tgjuPrice !== null) return tgjuPrice;

  console.log("TGJU USDT failed -> Nobitex fallback");
  return await getTetherPriceFromNobitex();
}


// ==========================================
// ۴. عیار - منبع ایموفید
// ==========================================

async function getAyarPriceFromEmofid() {
  try {
    const response = await fetch("https://www.emofid.com/funds/ayar/", {
      method: "GET",
      headers: EMOFID_HEADERS
    });

    if (!response.ok) {
      throw new Error(`Emofid HTTP ${response.status}`);
    }

    const html = await response.text();
    const text = htmlToText(html);

    let rialPrice = extractNumberAfterLabel(text, "آخرین قیمت", 100);

    if (rialPrice === null) {
      rialPrice = extractNumberAfterLabel(text, "قیمت آخرین معامله", 100);
    }

    if (rialPrice === null) {
      rialPrice = extractNumberAfterLabel(text, "آخرین معامله", 100);
    }

    if (rialPrice === null) {
      throw new Error("آخرین قیمت عیار از صفحه ایموفید پیدا نشد.");
    }

    const tomanPrice = rialToToman(rialPrice);

    if (tomanPrice === null) {
      throw new Error("تبدیل قیمت عیار ایموفید نامعتبر بود.");
    }

    if (tomanPrice < 10000 || tomanPrice > 300000) {
      throw new Error(`قیمت عیار ایموفید غیرمنطقی است: ${tomanPrice}`);
    }

    console.log(`AYAR EMOFID | ${rialPrice} Rial -> ${tomanPrice} Toman`);
    return tomanPrice;
  } catch (error) {
    console.error("AYAR EMOFID ERROR:", error.message);
    return null;
  }
}


// ==========================================
// ۵. عیار - Fallback TGJU
// ==========================================

async function getAyarPriceFromTGJU() {
  try {
    const html = await fetchTgjuPage("ime_fund_ayar");
    const text = htmlToText(html);

    const rialPrice = extractNumberAfterLabel(text, "نرخ فعلی", 80);

    if (rialPrice === null) {
      throw new Error("نرخ فعلی عیار از TGJU پیدا نشد.");
    }

    const tomanPrice = rialToToman(rialPrice);

    if (tomanPrice === null) {
      throw new Error("تبدیل قیمت TGJU عیار نامعتبر بود.");
    }

    if (tomanPrice < 10000 || tomanPrice > 300000) {
      throw new Error(`قیمت TGJU عیار غیرمنطقی است: ${tomanPrice}`);
    }

    console.log(`AYAR TGJU | ${rialPrice} Rial -> ${tomanPrice} Toman`);
    return tomanPrice;
  } catch (error) {
    console.error("AYAR TGJU ERROR:", error.message);
    return null;
  }
}


async function getAyarPrice() {
  const emofidPrice = await getAyarPriceFromEmofid();
  if (emofidPrice !== null) {
    console.log(`AYAR SOURCE = EMOFID | ${emofidPrice} Toman`);
    return emofidPrice;
  }

  console.log("AYAR EMOFID FAILED -> TGJU FALLBACK");
  const tgjuPrice = await getAyarPriceFromTGJU();
  if (tgjuPrice !== null) {
    console.log(`AYAR SOURCE = TGJU | ${tgjuPrice} Toman`);
    return tgjuPrice;
  }

  return null;
}


// ==========================================
// دریافت و اعتبارسنجی قیمت‌ها
// ==========================================

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


function validateAllPrices(prices) {
  const errors = [];

  if (prices.goldPrice === null || !Number.isFinite(prices.goldPrice)) {
    errors.push("قیمت طلای ۱۸ معتبر نیست.");
  }

  if (prices.usdtPrice === null || !Number.isFinite(prices.usdtPrice)) {
    errors.push("قیمت تتر معتبر نیست.");
  }

  if (prices.ayarPrice === null || !Number.isFinite(prices.ayarPrice)) {
    errors.push("قیمت صندوق عیار معتبر نیست.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}


// ==========================================
// ساخت Caption
// ==========================================

async function generateCaption(channelId, overrideTime = null) {
  const prices = await fetchAllPrices();
  const validation = validateAllPrices(prices);

  if (!validation.valid) {
    throw new Error("قیمت‌ها معتبر نیستند:\n" + validation.errors.join("\n"));
  }

  const { dateStr, timeStr } = getTehranDateTime(overrideTime);

  return `قیمت‌های امروز ${dateStr} ساعت ${timeStr}

🔸 ۱۸ عیار هر گرم: ${formatFa(prices.goldPrice)} تومان
🔹 صندوق عیار: ${formatFa(prices.ayarPrice)} تومان
🟢 تتر: ${formatFa(prices.usdtPrice)} تومان

#قیمت_طلا #قیمت_تتر #طلا18عیار #صندوق_عیار #سرمایه_گذاری

🆔 ${channelId}`;
}


// ==========================================
// ارسال پست به کانال
// ==========================================

async function sendPostToChannel(botToken, channelId, overrideTime = null) {
  if (!botToken) {
    throw new Error("BOT_TOKEN Secret در Cloudflare پیدا نشد.");
  }

  const caption = await generateCaption(channelId, overrideTime);

  const payload = {
    chat_id: channelId,
    photo: PHOTO_URL,
    caption: caption
  };

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendPhoto`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  );

  return await response.json();
}


// ==========================================
// ارسال پیام Telegram
// ==========================================

async function sendTelegramMessage(botToken, chatId, text, extra = {}) {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        ...extra
      })
    }
  );

  return await response.json();
}


// ==========================================
// Cloudflare Worker
// ==========================================

export default {

  // ========================================
  // Cron
  // ========================================
  async scheduled(event, env, ctx) {
    try {
      if (!env.BOT_TOKEN) {
        console.error("BOT_TOKEN Secret تنظیم نشده.");
        return;
      }

      const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;
      console.log(`CRON STARTED for channel: ${channelId}`);

      const result = await sendPostToChannel(
        env.BOT_TOKEN,
        channelId,
        "۱۹:۰۰"
      );

      console.log("CRON TELEGRAM RESULT:", JSON.stringify(result));
    } catch (error) {
      console.error("CRON ERROR:", error.message);
    }
  },


  // ========================================
  // HTTP
  // ========================================
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (!env.BOT_TOKEN) {
      return new Response("BOT_TOKEN Secret تنظیم نشده است.", {
        status: 500
      });
    }

    const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;

    // Telegram Webhook
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
          await fetch(
            `https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                callback_query_id: callbackId,
                text: "⏳ در حال دریافت قیمت‌ها و ارسال به کانال..."
              })
            }
          );
        }

        // /start
        if (chatId && text === "/start") {
          const msg =
            `سلام! 👋\n\n` +
            `برای ارسال قیمت‌های لحظه‌ای به کانال ${channelId} ` +
            `دکمه زیر را فشار دهید یا دستور /send را ارسال کنید:`;

          await sendTelegramMessage(env.BOT_TOKEN, chatId, msg, {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "📤 ارسال هم‌اکنون پست به کانال",
                    callback_data: "/send"
                  }
                ]
              ]
            }
          });
        }

        // /send
        else if (chatId && text === "/send") {
          await sendTelegramMessage(
            env.BOT_TOKEN,
            chatId,
            `⏳ در حال ارسال به ${channelId}...`
          );

          try {
            const result = await sendPostToChannel(
              env.BOT_TOKEN,
              channelId
            );

            if (result.ok) {
              await sendTelegramMessage(
                env.BOT_TOKEN,
                chatId,
                "✅ پست با موفقیت در کانال منتشر شد!"
              );
            } else {
              await sendTelegramMessage(
                env.BOT_TOKEN,
                chatId,
                `❌ خطا در ارسال به کانال (${channelId}):\n${
                  result.description || JSON.stringify(result)
                }\n\nنکته: مطمئن شوید ربات در کانال ادمین با دسترسی Post Messages باشد.`
              );
            }
          } catch (error) {
            await sendTelegramMessage(
              env.BOT_TOKEN,
              chatId,
              `❌ پست ارسال نشد.\n\nدلیل:\n${error.message}`
            );
          }
        }

        return new Response("OK", { status: 200 });
      } catch (error) {
        console.error("WEBHOOK ERROR:", error.message);
        return new Response("Error: " + error.message, { status: 500 });
      }
    }

    // /send از طریق مرورگر
    if (url.pathname === "/send") {
      try {
        const result = await sendPostToChannel(
          env.BOT_TOKEN,
          channelId
        );

        return new Response(JSON.stringify(result, null, 2), {
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }, null, 2),
          {
            status: 500,
            headers: { "Content-Type": "application/json; charset=utf-8" }
          }
        );
      }
    }

    return new Response(
      `ربات فعال است 🚀\nکانال هدف فعلی: ${channelId}`,
      { status: 200 }
    );
  }
};
