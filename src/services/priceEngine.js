// ==========================================
// 📈 موتور قیمت‌گیری داینامیک، بدون فریز و خودترمیم
// ==========================================

import { BROWSER_HEADERS, htmlToText, extractNumberAfterLabel } from '../utils/html.js';
import { parseNumber, rialToToman } from '../utils/helpers.js';
import { sendErrorToAdmin } from './telegram.js';

// استخراج قیمت از TGJU (عمومی)
async function fetchFromTGJU(slug, label) {
  const cleanSlug = slug.split("?")[0].replace(/^\/|\/$/g, "");
  const response = await fetch(`https://www.tgju.org/profile/${cleanSlug}?_t=${Date.now()}`, {
    method: "GET",
    headers: BROWSER_HEADERS,
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!response.ok) throw new Error(`TGJU HTTP ${response.status} برای ${cleanSlug}`);
  const html = await response.text();
  const text = htmlToText(html);
  const targetLabel = label && label.trim() !== "" ? label : "نرخ فعلی";
  const price = extractNumberAfterLabel(text, targetLabel, 100);
  if (!price) throw new Error(`لیبل "${targetLabel}" در TGJU/${cleanSlug} پیدا نشد.`);
  return price;
}

// استخراج تخصصی و زنده عیار از TGJU نماد gc3
async function fetchAyarFromTGJU() {
  const response = await fetch(`https://www.tgju.org/profile/gc3?_t=${Date.now()}`, {
    method: "GET",
    headers: BROWSER_HEADERS,
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!response.ok) throw new Error(`TGJU gc3 HTTP ${response.status}`);
  const html = await response.text();

  // استخراج مستقیم از کلاس قیمت یا ویژگی دیتا
  const match = html.match(/class="info-price"[^>]*>([0-9۰-۹٠-٩,٬]+)/i) ||
                html.match(/data-col="info\.last_trade\.PDrCotVal"[^>]*>([0-9۰-۹٠-٩,٬]+)/i) ||
                html.match(/نرخ فعلی[\s\S]{0,100}?([0-9۰-۹٠-٩][0-9۰-۹٠-٩,٬]*)/i);

  if (match && match[1]) {
    const parsed = parseNumber(match[1]);
    if (parsed) return parsed;
  }

  const text = htmlToText(html);
  const price = extractNumberAfterLabel(text, "نرخ فعلی", 80);
  if (!price) throw new Error("قیمت زنده در صفحه gc3 پیدا نشد.");
  return price;
}

// استخراج مستقیم عیار از هسته TSETMC بورس
async function fetchAyarFromTSETMC() {
  const response = await fetch(`https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceDailyList/IRO9AYAR0001/1?_t=${Date.now()}`, {
    method: "GET",
    headers: {
      "User-Agent": BROWSER_HEADERS["User-Agent"],
      "Accept": "application/json"
    },
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!response.ok) throw new Error(`TSETMC HTTP ${response.status}`);
  const data = await response.json();
  const item = data?.closingPriceDaily?.[0];
  const price = item?.pDrCotVal || item?.pClosing;
  if (!price) throw new Error("قیمت TSETMC عیار خالی بود.");
  return Number(price);
}

// استخراج قیمت تتر از نوبیتکس
async function fetchFromNobitex(symbol) {
  const cleanSymbol = symbol.trim().toUpperCase() || "USDTIRT";
  const response = await fetch(`https://api.nobitex.ir/v2/orderbook/${cleanSymbol}`, {
    method: "GET",
    headers: { "Accept": "application/json" },
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!response.ok) throw new Error(`Nobitex HTTP ${response.status}`);
  const data = await response.json();
  const price = parseNumber(data?.lastTradePrice);
  if (!price) throw new Error("lastTradePrice در نوبیتکس پیدا نشد.");
  return price;
}

// استخراج قیمت از ایموفید
async function fetchFromEmofid(url) {
  const cleanUrl = url.split("?")[0];
  const response = await fetch(`${cleanUrl}?_t=${Date.now()}`, {
    method: "GET",
    headers: BROWSER_HEADERS,
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!response.ok) throw new Error(`Emofid HTTP ${response.status}`);
  const html = await response.text();

  const jsonMatch = html.match(/"nav":\s*([0-9]+)/i) || 
                    html.match(/"lastPrice":\s*([0-9]+)/i) ||
                    html.match(/"price":\s*([0-9]+)/i);

  if (jsonMatch && jsonMatch[1]) return Number(jsonMatch[1]);

  const text = htmlToText(html);
  const price = extractNumberAfterLabel(text, "قیمت هر واحد", 100) ||
                extractNumberAfterLabel(text, "آخرین قیمت", 100) ||
                extractNumberAfterLabel(text, "قیمت آخرین معامله", 100);

  if (!price) throw new Error("قیمت در ایموفید یافت نشد.");
  return price;
}

// استخراج قیمت سفارشی
async function fetchFromCustom(url, label) {
  const response = await fetch(url, {
    method: "GET",
    headers: BROWSER_HEADERS,
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!response.ok) throw new Error(`Custom HTTP ${response.status}`);
  const html = await response.text();
  const text = htmlToText(html);
  const price = extractNumberAfterLabel(text, label, 150);
  if (!price) throw new Error(`لیبل "${label}" پیدا نشد.`);
  return price;
}

// متد اصلی اجراکننده منبع
async function executeSource(type, slug, label) {
  if (slug === "gc3") {
    try {
      return await fetchAyarFromTGJU();
    } catch (e) {
      console.warn("TGJU gc3 خطا داد، امتحان TSETMC...");
      return await fetchAyarFromTSETMC();
    }
  }

  switch (type) {
    case "tgju":
      return await fetchFromTGJU(slug, label);
    case "nobitex":
      return await fetchFromNobitex(slug);
    case "emofid":
      return await fetchFromEmofid(slug);
    case "custom":
      return await fetchFromCustom(slug, label);
    default:
      throw new Error(`نوع منبع ناشناخته: ${type}`);
  }
}

// استخراج قیمت یک نماد با سیستم فال‌بک و گزارش خطا
export async function fetchSymbolPrice(symbol, env = null) {
  if (!symbol.enabled) return null;

  let rawPrice = null;
  let usedFallback = false;
  let firstError = "";

  // ۱. تست منبع اصلی
  try {
    rawPrice = await executeSource(symbol.source_type, symbol.source_slug, symbol.label);
  } catch (err) {
    firstError = err.message;
    console.warn(`[${symbol.name}] منبع اول ناموفق: ${firstError}`);

    // ۲. تست منبع دوم (Fallback)
    if (symbol.fallback_type && symbol.fallback_type !== "none" && symbol.fallback_slug) {
      try {
        rawPrice = await executeSource(symbol.fallback_type, symbol.fallback_slug, symbol.fallback_label);
        usedFallback = true;
      } catch (fallbackErr) {
        console.error(`[${symbol.name}] منبع دوم هم خطا داد: ${fallbackErr.message}`);
        if (env?.BOT_TOKEN && env?.ADMIN_USER_ID) {
          await sendErrorToAdmin(
            env.BOT_TOKEN,
            env.ADMIN_USER_ID,
            `نماد: ${symbol.name}\nخطای اول: ${firstError}\nخطای دوم: ${fallbackErr.message}`,
            "استخراج ناموفق هر دو منبع"
          );
        }
        return null;
      }
    } else {
      if (env?.BOT_TOKEN && env?.ADMIN_USER_ID) {
        await sendErrorToAdmin(
          env.BOT_TOKEN,
          env.ADMIN_USER_ID,
          `نماد: ${symbol.name}\nخطا: ${firstError}`,
          "استخراج بدون منبع پشتیبان"
        );
      }
      return null;
    }
  }

  // تبدیل ریال به تومان
  const isRial = usedFallback ? symbol.fallback_is_rial : symbol.is_rial;
  let finalPrice = isRial ? rialToToman(rawPrice) : parseNumber(rawPrice);

  // بررسی بازه منطقی
  if (!finalPrice || finalPrice < symbol.min || finalPrice > symbol.max) {
    const rangeMsg = `قیمت دریافت شده (${finalPrice}) خارج از محدوده مجاز است (${symbol.min} تا ${symbol.max})`;
    console.error(`[${symbol.name}] ${rangeMsg}`);
    if (env?.BOT_TOKEN && env?.ADMIN_USER_ID) {
      await sendErrorToAdmin(env.BOT_TOKEN, env.ADMIN_USER_ID, `نماد: ${symbol.name}\n${rangeMsg}`, "اعتبارسنجی قیمت");
    }
    return null;
  }

  return finalPrice;
}

// استخراج تمامی نمادها
export async function fetchAllPrices(settings, env = null) {
  const activeSymbols = settings.symbols.filter(s => s.enabled);
  return await Promise.all(
    activeSymbols.map(async (symbol) => ({
      symbol,
      price: await fetchSymbolPrice(symbol, env)
    }))
  );
}
