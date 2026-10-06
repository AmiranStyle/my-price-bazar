// ==========================================
// 📅 ابزارهای تاریخ و زمان تهران
// ==========================================

// دریافت تاریخ و ساعت تهران
export function getTehranDateTime() {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(now);

  const timeStr = new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(now);

  return { dateStr, timeStr };
}

// تبدیل زمان تهران به ساعت UTC
export function tehranTimeToUTC(timeStr) {
  // زمان تهران = UTC+3:30
  const [h, m] = timeStr.split(":").map(Number);
  let utcH = h - 3;
  let utcM = m - 30;
  if (utcM < 0) { utcM += 60; utcH -= 1; }
  if (utcH < 0) utcH += 24;
  return `${String(utcH).padStart(2, "0")}:${String(utcM).padStart(2, "0")}`;
}
