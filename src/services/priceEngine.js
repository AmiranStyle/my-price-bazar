// ==========================================
// 📈 موتور قیمت‌گیری داینامیک و هوشمند
// ==========================================

import { BROWSER_HEADERS, htmlToText, extractNumberAfterLabel } from '../utils/html.js';
import { parseNumber, rialToToman } from '../utils/helpers.js';

async function fetchFromTGJU(slug, label) {
  const response = await fetch(`https://www.tgju.org/profile/${slug}`, {
    method: "GET",
    headers: BROWSER_HEADERS
  });
  if (!response.ok) throw new Error(`TGJU HTTP ${response.status}`);
  const html = await response.text();
  const text = htmlToText(html);
  const price = extractNumberAfterLabel(text, label || "نرخ فعلی", 100);
  if (!price) throw new Error(`لیبل "${label}" در TGJU/${slug} پیدا نشد.`);
  return price;
}

async function fetchFromNobitex(symbol) {
  const response = await fetch(`https://api.nobitex.ir/v2/orderbook/${symbol}`, {
    method: "GET",
    headers: { "Accept": "application/json" }
  });
  if (!response.ok) throw new Error(`Nobitex HTTP ${response.status}`);
  const data = await response.json();
  const price = parseNumber(data?.lastTradePrice);
  if (!price) throw new Error("قیمت در پاسخ نوبیتکس پیدا نشد.");
  return price;
}

async function fetchFromEmofid(url, label) {
  const response = await fetch(url, {
    method: "GET",
    headers: BROWSER_HEADERS
  });
  if (!response.ok) throw new Error(`Emofid HTTP ${response.status}`);
  const html = await response.text();
  const text = htmlToText(html);
  const price =
    extractNumberAfterLabel(text, label, 100) ||
    extractNumberAfterLabel(text, "قیمت آخرین معامله", 100) ||
    extractNumberAfterLabel(text, "قیمت هر واحد", 100) ||
    extractNumberAfterLabel(text, "آخرین قیمت", 100);
  if (!price) throw new Error(`لیبل "${label}" در صفحه ایموفید پیدا نشد.`);
  return price;
}

async function fetchFromCustom(url, label) {
  const response = await fetch(url, {
    method: "GET",
    headers: BROWSER_HEADERS
  });
  if (!response.ok) throw new Error(`Custom HTTP ${response.status}`);
  const html = await response.text();
  const text = htmlToText(html);
  const price = extractNumberAfterLabel(text, label, 150);
  if (!price) throw new Error(`لیبل "${label}" در صفحه سفارشی پیدا نشد.`);
  return price;
}

export async function fetchSymbolPrice(symbol) {
  try {
    if (!symbol.enabled) return null;

    let rawPrice = null;

    switch (symbol.source_type) {
      case "tgju":
        rawPrice = await fetchFromTGJU(symbol.source_slug, symbol.label);
        break;
      case "nobitex":
        rawPrice = await fetchFromNobitex(symbol.source_slug);
        break;
      case "emofid":
        rawPrice = await fetchFromEmofid(symbol.source_slug, symbol.label);
        break;
      case "custom":
        rawPrice = await fetchFromCustom(symbol.source_slug, symbol.label);
        break;
      default:
        throw new Error(`نوع منبع ناشناخته: ${symbol.source_type}`);
    }

    let finalPrice = symbol.is_rial ? rialToToman(rawPrice) : parseNumber(rawPrice);

    if (!finalPrice || finalPrice < symbol.min || finalPrice > symbol.max) {
      throw new Error(`قیمت خارج از محدوده مجاز (${symbol.min} تا ${symbol.max}): ${finalPrice}`);
    }

    return finalPrice;
  } catch (error) {
    console.error(`SYMBOL ERROR [${symbol.name}]:`, error.message);
    return null;
  }
}

export async function fetchAllPrices(settings) {
  const activeSymbols = settings.symbols.filter(s => s.enabled);
  const results = await Promise.all(
    activeSymbols.map(async (symbol) => ({
      symbol,
      price: await fetchSymbolPrice(symbol)
    }))
  );
  return results;
}
