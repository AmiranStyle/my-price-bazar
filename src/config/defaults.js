// ==========================================
// ⚙️ تنظیمات پیش‌فرض با ساختار چندمنبعی (Dynamic Sources)
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
        min: 1000000,
        max: 150000000,
        enabled: true,
        sources: [
          { type: "tgju", target: "geram18", label: "نرخ فعلی", is_rial: true }
        ]
      },
      {
        id: "usdt",
        name: "تتر (USDT)",
        emoji: "🟢",
        min: 20000,
        max: 500000,
        enabled: true,
        sources: [
          { type: "nobitex", target: "USDTIRT", label: "", is_rial: true },
          { type: "tgju", target: "crypto-tether", label: "قیمت ریالی", is_rial: true }
        ]
      },
      {
        id: "ayar",
        name: "صندوق عیار",
        emoji: "🔹",
        min: 10000,
        max: 500000,
        enabled: true,
        sources: [
          { type: "emofid", target: "https://www.emofid.com/funds/ayar/", label: "قیمت صدور", is_rial: true },
          { type: "tgju", target: "gc3", label: "نرخ فعلی", is_rial: true },
          { type: "tgju", target: "ime_fund_ayar", label: "نرخ فعلی", is_rial: true },
          { type: "tsetmc", target: "IRO9AYAR0001", label: "", is_rial: true }
        ]
      }
    ],
    schedules: [
      { id: "sch_1", time: "19:00", enabled: true }
    ]
  };
}
