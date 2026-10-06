// ==========================================
// 🔧 ابزارهای عمومی تبدیل و فرمت‌دهی
// ==========================================

export function toEngDigits(str) {
  if (!str) return "";
  return String(str)
    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

export function parseNumber(value) {
  if (!value) return null;
  const normalized = toEngDigits(String(value))
    .replace(/[,\u066C\u066B\s]/g, "")
    .trim();
  const num = Number(normalized);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function formatFa(num) {
  if (!Number.isFinite(Number(num))) return "نامشخص";
  return Number(num).toLocaleString("fa-IR");
}

export function rialToToman(rial) {
  const value = parseNumber(rial);
  return value ? Math.round(value / 10) : null;
}
