// ==========================================
// 📱 ارتباطات تلگرام
// ==========================================

// ارسال پیام متنی
export async function sendTelegramMessage(botToken, chatId, text, extra = {}) {
  if (!botToken) throw new Error("BOT_TOKEN تنظیم نشده است.");
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra })
    }
  );
  return await response.json();
}

// ارسال هشدار خطا به پی‌وی مدیر
export async function sendErrorToAdmin(botToken, adminId, errorMsg, context = "نامشخص") {
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
