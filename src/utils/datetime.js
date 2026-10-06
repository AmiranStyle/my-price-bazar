// ==========================================
// 📅 ابزارهای تاریخ و زمان تهران (چینش دقیق فارسی)
// ==========================================

export function getTehranDateTime() {
  const now = new Date();

  // ۱. استخراج مجزای اجزای تاریخ شمسی با formatToParts برای کنترل دقیق چیدمان
  const dateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

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

  // چیدمان استاندارد فارسی: سه‌شنبه ۱۶ آذر ۱۴۰۵
  // افزودن کاراکتر کنترل جهت راست‌به‌چپ (\u200F) جهت تثبیت در تلگرام
  const dateStr = `\u200F${weekday} ${day} ${month} ${year}\u200F`.trim();

  // ۲. استخراج ساعت رسمی تهران با اعداد فارسی
  const timeFormatter = new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const timeStr = `\u200F${timeFormatter.format(now)}\u200F`.trim();

  return { dateStr, timeStr };
}

// تبدیل زمان تهران به ساعت UTC برای کرون‌جاب
export function tehranTimeToUTC(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  let utcH = h - 3;
  let utcM = m - 30;
  if (utcM < 0) { utcM += 60; utcH -= 1; }
  if (utcH < 0) utcH += 24;
  return `${String(utcH).padStart(2, "0")}:${String(utcM).padStart(2, "0")}`;
}
