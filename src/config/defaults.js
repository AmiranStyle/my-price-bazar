// ==========================================
// ⚙️ تنظیمات پیش‌فرض با معماری چندمنبعی (Fallbacks)
// ==========================================

export function getDefaultSettings(env = {}) {
  return {
    channel_id: env.DEFAULT_CHANNEL_ID || "@PulseHub_co",
    admin_id: env.ADMIN_USER_ID || "165944913",
    photo_url: env.PHOTO_URL || "https://i.postimg.cc/1t65gR2L/Chat-GPT-Image-Aug-14-2026-02-44-30-AM.png",
    caption_template:
      "📊 <b>قیمت‌های لحظه‌ای بازار</b>\n" +
      "🗓 {date} | ساعت {time}\n\n" +
      "{prices}\n\n" +
      "#قیمت_طلا #تتر #سرمایه_گذاری\n\n" +
      "🆔 {channel}",
    symbols: [
      {
        id: "gold18",
        name: "طلای ۱۸ عیار",
        emoji: "🔸",
        source_type: "tgju",
        source_slug: "geram18",
        label: "نرخ فعلی",
        is_rial: true,
        // منبع پشتیبان
        fallback_type: "none",
        fallback_slug: "",
        fallback_label: "",
        fallback_is_rial: true,
        min: 1000000,
        max: 150000000,
        enabled: true
      },
      {
        id: "usdt",
        name: "تتر (USDT)",
        emoji: "🟢",
        source_type: "nobitex",
        source_slug: "USDTIRT",
        label: "",
        is_rial: true,
        // منبع پشتیبان: TGJU در صورت اختلال نوبیتکس
        fallback_type: "tgju",
        fallback_slug: "crypto-tether",
        fallback_label: "قیمت ریالی",
        fallback_is_rial: true,
        min: 20000,
        max: 500000,
        enabled: true
      },
      {
        id: "ayar",
        name: "صندوق عیار",
        emoji: "🔹",
        source_type: "emofid",
        source_slug: "https://www.emofid.com/funds/ayar/",
        label: "آخرین قیمت",
        is_rial: true,
        // منبع پشتیبان: TGJU اسلاگ زنده gc3
        fallback_type: "tgju",
        fallback_slug: "gc3",
        fallback_label: "نرخ فعلی",
        fallback_is_rial: true,
        min: 10000,
        max: 500000,
        enabled: true
      }
    ],
    schedules: [
      { id: "sch_1", time: "19:00", enabled: true }
    ]
  };
}
