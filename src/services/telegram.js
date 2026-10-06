// ==========================================
// 📱 سرویس پیام‌رسان تلگرام
// ==========================================

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

export async function sendErrorToAdmin(botToken, adminId, errorMsg, context = "عملیات سیستم") {
  if (!botToken || !adminId) return;

  const nowFa = new Date().toLocaleString("fa-IR", {
    timeZone: "Asia/Tehran",
    dateStyle: "full",
    timeStyle: "short"
  });

  const message =
    `🚨 <b>هشدار خطای بحرانی در ربات قیمت</b>\n\n` +
    `📌 <b>موقعیت:</b> ${context}\n` +
    `⚠️ <b>شرح خطا:</b>\n<code>${errorMsg}</code>\n\n` +
    `⏰ <b>زمان رخداد:</b> ${nowFa}`;

  try {
    await sendTelegramMessage(botToken, adminId, message);
  } catch (e) {
    console.error("خطا در ارسال پیام هشدار به ادمین:", e.message);
  }
}
