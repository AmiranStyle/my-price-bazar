// ==========================================
// 📈 موتور قیمت‌گیری داینامیک، چندمنبعی و خودترمیم
// پشتیبانی کامل از: Emofid, TGJU, Nobitex, TSETMC, Rahavard365, Custom
// ==========================================

import { BROWSER_HEADERS, htmlToText, extractNumberAfterLabel } from '../utils/html.js';
import { parseNumber, rialToToman } from '../utils/helpers.js';
import { sendErrorToAdmin } from './telegram.js';

// ------------------------------------------
// ۱. استخراج از TGJU
// ------------------------------------------
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

  if (label && label.trim() !== "") {
    const p = extractNumberAfterLabel(text, label, 100);
    if (p) return p;
  }

  if (cleanSlug.includes("tether")) {
    const pTether = extractNumberAfterLabel(text, "قیمت ریالی", 80);
    if (pTether) return pTether;
  }

  const regexMatch = html.match(/class="info-price"[^>]*>([0-9۰-۹٠-٩,٬]+)/i) ||
                     html.match(/data-col="info\.last_trade\.PDrCotVal"[^>]*>([0-9۰-۹٠-٩,٬]+)/i);
  if (regexMatch && regexMatch[1]) {
    const parsed = parseNumber(regexMatch[1]);
    if (parsed) return parsed;
  }

  const pCurrent = extractNumberAfterLabel(text, "نرخ فعلی", 80) ||
                   extractNumberAfterLabel(text, "قیمت پایانی", 80) ||
                   extractNumberAfterLabel(text, "آخرین قیمت", 80);
  if (pCurrent) return pCurrent;

  throw new Error(`نرخ در TGJU/${cleanSlug} شناسایی نشد.`);
}

// ------------------------------------------
// ۲. استخراج از ایموفید (Emofid)
// ------------------------------------------
async function fetchFromEmofid(url, label) {
  const targetUrl = (url && url.startsWith("http")) ? url.split("?")[0] : "https://www.emofid.com/funds/ayar/";
  const response = await fetch(`${targetUrl}?_t=${Date.now()}`, {
    method: "GET",
    headers: BROWSER_HEADERS,
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!response.ok) throw new Error(`Emofid HTTP ${response.status}`);
  const html = await response.text();
  const text = htmlToText(html);

  const labels = [label, "قیمت صدور", "قیمت ابطال", "قیمت هر واحد", "آخرین قیمت", "قیمت آخرین معامله"].filter(Boolean);
  for (const l of labels) {
    const price = extractNumberAfterLabel(text, l, 80);
    if (price && price > 1000) return price;
  }

  throw new Error("قیمت در صفحه ایموفید پیدا نشد.");
}

// ------------------------------------------
// ۳. استخراج اختصاصی از ای‌پی‌آی ره‌آورد ۳۶۵ (Rahavard365 API)
// ------------------------------------------
async function fetchFromRahavard(targetUrl) {
  const decoded = decodeURIComponent(targetUrl);
  const matchId = decoded.match(/asset\/(\d+)/i) || decoded.match(/(\d+)/);
  const assetId = matchId ? matchId[1] : "4475";

  const endpoints = [
    `https://rahavard365.com/api/v2/asset/${assetId}`,
    `https://rahavard365.com/api/asset/${assetId}`
  ];

  let lastError = "";

  for (const apiUrl of endpoints) {
    try {
      const response = await fetch(`${apiUrl}?_t=${Date.now()}`, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8",
          "Referer": `https://rahavard365.com/asset/${assetId}/`
        },
        cf: { cacheTtl: 0, cacheEverything: false }
      });

      if (response.ok) {
        const json = await response.json();
        const d = json?.data || json?.result || json;
        const price = d?.last_price || d?.close_price || d?.real_close_price;

        if (price && Number(price) > 1000) {
          return Number(price);
        }
      } else {
        lastError = `HTTP ${response.status}`;
      }
    } catch (e) {
      lastError = e.message;
    }
  }

  throw new Error(`ره‌آورد ۳۶۵ پاسخ نداد (${lastError})`);
}

// ------------------------------------------
// ۴. استخراج از نوبیتکس (Nobitex)
// ------------------------------------------
async function fetchFromNobitex(symbol) {
  const cleanSymbol = (symbol || "USDTIRT").trim().toUpperCase();
  const response = await fetch(`https://api.nobitex.ir/v2/orderbook/${cleanSymbol}`, {
    method: "GET",
    headers: { "Accept": "application/json" },
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!response.ok) throw new Error(`Nobitex HTTP ${response.status}`);
  const data = await response.json();
  const price = parseNumber(data?.lastTradePrice);
  if (!price) throw new Error("lastTradePrice در نوبیتکس یافت نشد.");
  return price;
}

// ------------------------------------------
// ۵. استخراج از TSETMC رسمی بورس
// ------------------------------------------
async function fetchFromTSETMC(inscode) {
  const cleanCode = inscode ? inscode.trim() : "IRO9AYAR0001";
  const response = await fetch(`https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceDailyList/${cleanCode}/1?_t=${Date.now()}`, {
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
  if (!price) throw new Error("قیمت در داده‌های بورس TSETMC یافت نشد.");
  return Number(price);
}

// ------------------------------------------
// ۶. استخراج از آدرس سفارشی عمومی
// ------------------------------------------
async function fetchFromCustom(url, label) {
  const response = await fetch(url, {
    method: "GET",
    headers: BROWSER_HEADERS,
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!response.ok) throw new Error(`Custom HTTP ${response.status}`);
  const html = await response.text();
  const text = htmlToText(html);
  const targetLabel = label && label.trim() !== "" ? label : "قیمت";
  const price = extractNumberAfterLabel(text, targetLabel, 150);
  if (!price) throw new Error(`لیبل "${targetLabel}" در صفحه پیدا نشد.`);
  return price;
}

// ------------------------------------------
// ۷. هدایت‌کننده هوشمند منبع
// ------------------------------------------
export async function executeSingleSource(source) {
  const type = source.type;
  const target = source.target || "";
  const label = source.label || "";

  // تشخیص خودکار ره‌آورد چه کاربر type را rahavard بگذارد و چه لینک را در custom بنویسد
  if (type === "rahavard" || (target && target.includes("rahavard365.com"))) {
    return await fetchFromRahavard(target);
  }

  switch (type) {
    case "emofid":
      return await fetchFromEmofid(target, label);
    case "tgju":
      return await fetchFromTGJU(target, label);
    case "nobitex":
      return await fetchFromNobitex(target);
    case "tsetmc":
      return await fetchFromTSETMC(target);
    case "custom":
      return await fetchFromCustom(target, label);
    default:
      throw new Error(`نوع منبع ناشناخته: ${type}`);
  }
}

// ------------------------------------------
// ۸. نرمال‌سازی نماد
// ------------------------------------------
export function normalizeSymbol(sym) {
  if (!sym.sources || !Array.isArray(sym.sources) || sym.sources.length === 0) {
    sym.sources = [];
    if (sym.source_type) {
      sym.sources.push({
        type: sym.source_type,
        target: sym.source_slug || "",
        label: sym.label || "",
        is_rial: sym.is_rial !== false
      });
    }
    if (sym.fallback_type && sym.fallback_type !== "none") {
      sym.sources.push({
        type: sym.fallback_type,
        target: sym.fallback_slug || "",
        label: sym.fallback_label || "",
        is_rial: sym.fallback_is_rial !== false
      });
    }
  }
  return sym;
}

// ------------------------------------------
// ۹. محاسبه قیمت نهایی تومان
// ------------------------------------------
function computeFinalPrice(rawPrice, isRial, symbol) {
  let needRialConvert = isRial === true || isRial === "true";
  
  if (symbol.id !== "gold18" && rawPrice > 100000) {
    needRialConvert = true;
  }
  if (symbol.id === "gold18" && rawPrice > 100000000) {
    needRialConvert = true;
  }

  return needRialConvert ? rialToToman(rawPrice) : parseNumber(rawPrice);
}

// ------------------------------------------
// ۱۰. استخراج آبشاری قیمت یک نماد
// ------------------------------------------
export async function fetchSymbolPrice(symbol, env = null) {
  if (!symbol.enabled) return null;
  const sym = normalizeSymbol(symbol);

  const errors = [];
  let finalPrice = null;

  for (let i = 0; i < sym.sources.length; i++) {
    const src = sym.sources[i];
    try {
      const rawPrice = await executeSingleSource(src);
      if (rawPrice && rawPrice > 0) {
        finalPrice = computeFinalPrice(rawPrice, src.is_rial, sym);
        if (finalPrice >= sym.min && finalPrice <= sym.max) {
          return finalPrice;
        } else {
          errors.push(`منبع ${i + 1} (${src.type}): قیمت ${finalPrice} خارج از محدوده (${sym.min}-${sym.max})`);
        }
      }
    } catch (e) {
      errors.push(`منبع ${i + 1} (${src.type}): ${e.message}`);
    }
  }

  if (env?.BOT_TOKEN && env?.ADMIN_USER_ID) {
    await sendErrorToAdmin(
      env.BOT_TOKEN,
      env.ADMIN_USER_ID,
      `نماد: ${sym.name}\nتمام منابع ناموفق بودند:\n` + errors.join("\n"),
      "شکست در استخراج قیمت"
    );
  }

  return null;
}

// ------------------------------------------
// ۱۱. تست تشخیصی منابع یک نماد
// ------------------------------------------
export async function testSymbolDiagnostics(symbol) {
  const sym = normalizeSymbol(symbol);
  const results = [];

  for (let i = 0; i < sym.sources.length; i++) {
    const src = sym.sources[i];
    try {
      const rawPrice = await executeSingleSource(src);
      const tomanPrice = computeFinalPrice(rawPrice, src.is_rial, sym);
      const inRange = tomanPrice >= sym.min && tomanPrice <= sym.max;
      results.push({
        index: i + 1,
        type: src.type,
        target: src.target,
        status: inRange ? "success" : "range_error",
        raw: rawPrice,
        toman: tomanPrice,
        inRange,
        error: inRange ? null : `خارج از بازه (${sym.min} تا ${sym.max})`
      });
    } catch (err) {
      results.push({
        index: i + 1,
        type: src.type,
        target: src.target,
        status: "failed",
        raw: null,
        toman: null,
        error: err.message
      });
    }
  }

  const working = results.find(r => r.status === "success");
  return {
    symbolName: sym.name,
    symbolId: sym.id,
    results,
    finalPrice: working ? working.toman : null
  };
}

// ------------------------------------------
// ۱۲. استخراج قیمت کلیه نمادها
// ------------------------------------------
export async function fetchAllPrices(settings, env = null) {
  const activeSymbols = settings.symbols.filter(s => s.enabled);
  return await Promise.all(
    activeSymbols.map(async (symbol) => ({
      symbol,
      price: await fetchSymbolPrice(symbol, env)
    }))
  );
}
