const BOT_TOKEN = "8993031014:AAFL2otp7p9tCuWQm0d1_N7pJKjD8W_1tcg"; // توکنی که از BotFather گرفتید
const CHANNEL_ID = "@AmiranEducation";
// لینک مستقیم عکس آپلود شده
const PHOTO_URL = "https://i.postimg.cc/1t65gR2L/Chat-GPT-Image-Aug-14-2026-02-44-30-AM.png"; 

// تبدیل اعداد به فارسی و فرمت سه رقم سه رقم
function formatNumberFa(num) {
  if (!num) return "در حال به روزرسانی";
  const formatted = Number(num).toLocaleString('fa-IR');
  return formatted;
}

// گرفتن تاریخ و زمان شمسی ایران
function getJalaliDate() {
  const options = {
    timeZone: 'Asia/Tehran',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', options);
  return formatter.format(new Date());
}

// 스کرپ و دریافت قیمت‌ها
async function fetchPrices() {
  let goldPrice = "نامشخص";
  let usdtPrice = "نامشخص";
  let ayarPrice = "نامشخص";

  try {
    // 1. دریافت قیمت تتر از نوبیتکس (API رسمی و سریع)
    const nobitexRes = await fetch("https://api.nobitex.ir/v2/orderbook/USDTIRT");
    const nobitexData = await nobitexRes.json();
    if (nobitexData && nobitexData.lastTradePrice) {
      // تبدیل ریال به تومان
      usdtPrice = Math.round(Number(nobitexData.lastTradePrice) / 10);
    }
  } catch (e) {
    console.error("خطا در دریافت تتر:", e);
  }

  try {
    // 2. دریافت قیمت طلا 18 عیار از TGJU
    const tgjuRes = await fetch("https://www.tgju.org/profile/geram18");
    const tgjuHtml = await tgjuRes.text();
    const goldMatch = tgjuHtml.match(/data-price="([^"]+)"/);
    if (goldMatch && goldMatch[1]) {
      // تبدیل ریال به تومان
      goldPrice = Math.round(Number(goldMatch[1].replace(/,/g, '')) / 10);
    }
  } catch (e) {
    console.error("خطا در دریافت طلا:", e);
  }

  try {
    // 3. دریافت قیمت صندوق عیار
    const ayarRes = await fetch("https://www.emofid.com/funds/ayar/");
    const ayarHtml = await ayarRes.text();
    // استخراج قیمت بر اساس ساختار صفحه
    const ayarMatch = ayarHtml.match(/([0-9,]+)\s*ریال/);
    if (ayarMatch && ayarMatch[1]) {
      ayarPrice = Math.round(Number(ayarMatch[1].replace(/,/g, '')) / 10);
    }
  } catch (e) {
    console.error("خطا در دریافت صندوق عیار:", e);
  }

  return { goldPrice, usdtPrice, ayarPrice };
}

// ساخت متن نهایی پست
async function generatePostText() {
  const prices = await fetchPrices();
  const dateTimeStr = getJalaliDate();

  const caption = `قیمت‌های امروز ${dateTimeStr}

🔸 **۱۸عیار هر گرم:** ${formatNumberFa(prices.goldPrice)} تومان
🔹 **صندوق عیار:** ${formatNumberFa(prices.ayarPrice)} تومان
🟢 **تتر:** ${formatNumberFa(prices.usdtPrice)} تومان

#قیمت_طلا #قیمت_تتر #طلا18عیار #صندوق_عیار #سرمایه_گذاری

🆔 ${CHANNEL_ID}`;

  return caption;
}

// ارسال پست به کانال تلگرام
async function sendTelegramPost() {
  const caption = await generatePostText();
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;

  const payload = {
    chat_id: CHANNEL_ID,
    photo: PHOTO_URL,
    caption: caption,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔄 به‌روزرسانی آنلاین قیمت", callback_data: "refresh_price" }
        ]
      ]
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return await response.json();
}

// هندلر اصلی کلادفلر (برای وب‌هوک و کرون‌جاب)
export default {
  // ۱. ارسال اتوماتیک سر ساعت ۱۹ (Cron Trigger)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendTelegramPost());
  },

  // ۲. پاسخ به درخواست‌های دستی (ورودی وب‌هوک یا مرورگر)
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // اگر دکمه شیشه‌ای کلیک شد یا آدرس ربات صدا زده شد
    if (request.method === "POST") {
      const update = await request.json();
      
      // پاسخ به دکمه شیشه‌ای
      if (update.callback_query) {
        const callback = update.callback_query;
        if (callback.data === "refresh_price") {
          await sendTelegramPost();
          // بستن حالت لودینگ دکمه
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callback_query_id: callback.id,
              text: "✅ قیمت جدید در کانال پست شد!",
              show_alert: false
            })
          });
        }
      }
      return new Response("OK");
    }

    // تست دستی از مرورگر: اگر آدرس worker را باز کنید مستقیم یک پست می‌فرستد
    if (url.pathname === "/send") {
      const res = await sendTelegramPost();
      return new Response(JSON.stringify(res), { headers: { "Content-Type": "application/json" } });
    }

    return new Response("ربات فعال است 🚀");
  }
};
