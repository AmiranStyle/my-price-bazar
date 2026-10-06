// ==========================================
// 🎯 نقطه ورود اصلی ورکر - ورژن ۴.۱
// معماری ماژولار و حرفه‌ای
// ==========================================

// وارد کردن ماژول‌ها
import { getSettings, saveSettings, getSentLog, addSentLog } from './services/kv.js';
import { fetchAllPrices } from './services/priceEngine.js';
import { sendTelegramMessage, sendErrorToAdmin } from './services/telegram.js';
import { generateCaption, sendPostToChannel } from './core/post.js';
import { renderLoginPage } from './ui/auth.js';
import { renderDashboardLayout } from './ui/layout.js';
import { renderGeneralTab } from './ui/generalTab.js';
import { renderSymbolsTab, renderSymbolEditForm } from './ui/symbolsTab.js';
import { renderScheduleTab } from './ui/scheduleTab.js';
import { renderContentTab } from './ui/contentTab.js';


// ==========================================
// 🚀 هسته اصلی ورکر
// ==========================================

export default {

  // ────────────────────────────────────────
  // HTTP Handler
  // ────────────────────────────────────────
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const botToken = env.BOT_TOKEN;

    if (!botToken) {
      return new Response("⚠️ BOT_TOKEN Secret تنظیم نشده است.", { status: 500 });
    }

    const settings = await getSettings(env);
    const adminPassword = env.ADMIN_PASSWORD;

    // ── بررسی احراز هویت برای مسیرهای مدیریتی ──
    const isAdminPath = url.pathname.startsWith("/admin") || url.pathname === "/";
    if (isAdminPath && url.pathname !== "/logout") {
      if (!adminPassword) {
        return new Response(renderLoginPage("⚠️ رمز عبور تنظیم نشده."), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }

      // ورود با رمز عبور
      if (request.method === "POST" && url.pathname === "/admin") {
        const formData = await request.formData();
        if (formData.get("password") === adminPassword) {
          const response = new Response(renderDashboardLayout("general", renderGeneralTab(settings)), {
            headers: { "Content-Type": "text/html; charset=utf-8" }
          });
          response.headers.set("Set-Cookie", "admin_auth=verified; Path=/; Max-Age=86400; HttpOnly; SameSite=Strict");
          return response;
        } else {
          return new Response(renderLoginPage("❌ رمز عبور اشتباه است!"), {
            headers: { "Content-Type": "text/html; charset=utf-8" }
          });
        }
      }

      // بررسی کوکی برای سایر مسیرهای مدیریتی
      const cookies = request.headers.get("Cookie") || "";
      if (!cookies.includes("admin_auth=verified")) {
        return new Response(renderLoginPage(), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
    }

    // ── مسیر: خروج ──
    if (url.pathname === "/logout") {
      const response = new Response(
        `<html dir="rtl"><body style="font-family:Tahoma;text-align:center;padding:50px"><p>✅ خارج شدید.</p><a href="/admin">بازگشت</a></body></html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
      response.headers.set("Set-Cookie", "admin_auth=; Path=/; Max-Age=0");
      return response;
    }

    // ── مسیر: داشبورد اصلی ──
    if (url.pathname === "/admin" || url.pathname === "/") {
      if (request.method === "POST") return new Response("OK");
      return new Response(renderDashboardLayout("general", renderGeneralTab(settings)), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // ── مسیر: ذخیره تنظیمات عمومی ──
    if (url.pathname === "/admin/save-general" && request.method === "POST") {
      const formData = await request.formData();
      settings.channel_id = formData.get("channel_id") || settings.channel_id;
      settings.admin_id = formData.get("admin_id") || settings.admin_id;
      await saveSettings(env, settings);
      return new Response(renderDashboardLayout("general", renderGeneralTab(settings, "✅ تنظیمات با موفقیت ذخیره شد.")), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // ── مسیر: لیست نمادها ──
    if (url.pathname === "/admin/symbols") {
      return new Response(renderDashboardLayout("symbols", renderSymbolsTab(settings)), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // ── مسیر: فرم افزودن/ویرایش نماد ──
    if (url.pathname === "/admin/symbols/edit") {
      const index = url.searchParams.get("index");
      const symbol = index === "new" ? null : settings.symbols[Number(index)];
      return new Response(renderDashboardLayout("symbols", renderSymbolEditForm(symbol, index)), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // ── مسیر: ذخیره نماد ──
    if (url.pathname === "/admin/symbols/save" && request.method === "POST") {
      const formData = await request.formData();
      const index = formData.get("index");
      const symbolData = {
        id: formData.get("id"),
        name: formData.get("name"),
        emoji: formData.get("emoji") || "📌",
        source_type: formData.get("source_type"),
        source_slug: formData.get("source_slug"),
        label: formData.get("label") || "",
        is_rial: formData.get("is_rial") === "true",
        min: Number(formData.get("min")) || 0,
        max: Number(formData.get("max")) || 999999999,
        enabled: formData.get("enabled") === "on"
      };

      if (index === "new") {
        settings.symbols.push(symbolData);
      } else {
        settings.symbols[Number(index)] = symbolData;
      }

      await saveSettings(env, settings);
      return new Response(renderDashboardLayout("symbols", renderSymbolsTab(settings, "✅ نماد با موفقیت ذخیره شد.")), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // ── مسیر: تغییر وضعیت نماد ──
    if (url.pathname === "/admin/symbols/toggle") {
      const index = Number(url.searchParams.get("index"));
      settings.symbols[index].enabled = !settings.symbols[index].enabled;
      await saveSettings(env, settings);
      return Response.redirect(url.origin + "/admin/symbols", 302);
    }

    // ── مسیر: حذف نماد ──
    if (url.pathname === "/admin/symbols/delete") {
      const index = Number(url.searchParams.get("index"));
      settings.symbols.splice(index, 1);
      await saveSettings(env, settings);
      return Response.redirect(url.origin + "/admin/symbols", 302);
    }

    // ── مسیر: لیست زمان‌بندی ──
    if (url.pathname === "/admin/schedule") {
      return new Response(renderDashboardLayout("schedule", renderScheduleTab(settings)), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // ── مسیر: افزودن زمان جدید ──
    if (url.pathname === "/admin/schedule/add" && request.method === "POST") {
      const formData = await request.formData();
      const time = formData.get("time");
      if (time) {
        settings.schedules.push({ id: "sch_" + Date.now(), time, enabled: true });
        await saveSettings(env, settings);
      }
      return Response.redirect(url.origin + "/admin/schedule", 302);
    }

    // ── مسیر: تغییر وضعیت زمان ──
    if (url.pathname === "/admin/schedule/toggle") {
      const index = Number(url.searchParams.get("index"));
      settings.schedules[index].enabled = !settings.schedules[index].enabled;
      await saveSettings(env, settings);
      return Response.redirect(url.origin + "/admin/schedule", 302);
    }

    // ── مسیر: حذف زمان ──
    if (url.pathname === "/admin/schedule/delete") {
      const index = Number(url.searchParams.get("index"));
      settings.schedules.splice(index, 1);
      await saveSettings(env, settings);
      return Response.redirect(url.origin + "/admin/schedule", 302);
    }

    // ── مسیر: محتوای پست ──
    if (url.pathname === "/admin/content") {
      return new Response(renderDashboardLayout("content", renderContentTab(settings)), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // ── مسیر: ذخیره محتوا ──
    if (url.pathname === "/admin/content/save" && request.method === "POST") {
      const formData = await request.formData();
      settings.caption_template = formData.get("caption_template") || settings.caption_template;
      settings.photo_url = formData.get("photo_url") || settings.photo_url;
      await saveSettings(env, settings);
      return new Response(renderDashboardLayout("content", renderContentTab(settings, "✅ محتوا با موفقیت ذخیره شد.")), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // ── مسیر: پیش‌نمایش پست ──
    if (url.pathname === "/preview") {
      try {
        const priceResults = await fetchAllPrices(settings);
        const caption = await generateCaption(settings, priceResults);
        return new Response(`
<html dir="rtl"><head><meta charset="UTF-8"><style>body{font-family:Tahoma;padding:2rem;max-width:600px;margin:0 auto}pre{background:#f5f5f5;padding:1rem;border-radius:8px;white-space:pre-wrap}</style></head>
<body><h2>👁 پیش‌نمایش کپشن</h2><pre>${caption}</pre><a href="/admin/content">بازگشت</a></body></html>`,
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      } catch (error) {
        return new Response(`خطا در پیش‌نمایش: ${error.message}`, { status: 500 });
      }
    }

    // ── مسیر: ارسال دستی به کانال ──
    if (url.pathname === "/send") {
      try {
        await sendPostToChannel(botToken, settings);
        return new Response(
          JSON.stringify({ ok: true, message: "پست با موفقیت ارسال شد." }, null, 2),
          { headers: { "Content-Type": "application/json; charset=utf-8" } }
        );
      } catch (error) {
        await sendErrorToAdmin(botToken, settings.admin_id, error.message, "ارسال دستی (/send)");
        return new Response(
          JSON.stringify({ ok: false, error: error.message }, null, 2),
          { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
        );
      }
    }

    // ── مسیر: تست قیمت‌ها ──
    if (url.pathname === "/test-api") {
      try {
        const priceResults = await fetchAllPrices(settings);
        const data = {};
        priceResults.forEach(r => { data[r.symbol.id] = r.price; });
        return new Response(
          JSON.stringify({ ok: true, data }, null, 2),
          { headers: { "Content-Type": "application/json; charset=utf-8" } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }, null, 2),
          { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
        );
      }
    }

    // ── مسیر: Webhook تلگرام ──
    if (request.method === "POST") {
      try {
        const update = await request.json();
        let chatId = null, text = null, callbackId = null;

        if (update.message) {
          chatId = update.message.chat.id;
          text = update.message.text;
        } else if (update.callback_query) {
          chatId = update.callback_query.message.chat.id;
          text = update.callback_query.data;
          callbackId = update.callback_query.id;
        }

        if (callbackId) {
          await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callback_query_id: callbackId, text: "⏳ در حال پردازش..." })
          });
        }

        if (chatId && (text === "/start" || text === "/send")) {
          if (String(chatId) !== String(settings.admin_id)) {
            await sendTelegramMessage(botToken, chatId, "⛔ دسترسی غیرمجاز.");
            return new Response("OK", { status: 200 });
          }

          if (text === "/start") {
            const msg = `سلام! 👋\nربات قیمت‌دهی فعال است.\nکانال: ${settings.channel_id}\n\nبرای ارسال فوری دکمه زیر را بزنید:`;
            await sendTelegramMessage(botToken, chatId, msg, {
              reply_markup: {
                inline_keyboard: [[{ text: "📤 ارسال هم‌اکنون", callback_data: "/send" }]]
              }
            });
          } else if (text === "/send") {
            await sendTelegramMessage(botToken, chatId, "⏳ در حال دریافت و ارسال...");
            try {
              await sendPostToChannel(botToken, settings);
              await sendTelegramMessage(botToken, chatId, "✅ ارسال شد!");
            } catch (error) {
              await sendTelegramMessage(botToken, chatId, `❌ خطا: ${error.message}`);
              await sendErrorToAdmin(botToken, settings.admin_id, error.message, "دستور تلگرام /send");
            }
          }
        }

        return new Response("OK", { status: 200 });
      } catch (error) {
        console.error("WEBHOOK ERROR:", error.message);
        return new Response("Error", { status: 500 });
      }
    }

    // ── مسیر پیش‌فرض ──
    return new Response(
      `🤖 ربات قیمت‌دهی فعال است.\nکانال: ${settings.channel_id}\n\nبرای مدیریت: /admin`,
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  },


  // ────────────────────────────────────────
  // Cron Handler (هر ۱۰ دقیقه)
  // ────────────────────────────────────────
  async scheduled(event, env, ctx) {
    try {
      const botToken = env.BOT_TOKEN;
      if (!botToken) return;

      const settings = await getSettings(env);
      const now = new Date();

      const tehranNow = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Tehran",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).format(now);

      const currentHour = Number(tehranNow.split(":")[0]);
      const currentMinute = Number(tehranNow.split(":")[1]);

      const sentLog = await getSentLog(env);

      for (const schedule of settings.schedules) {
        if (!schedule.enabled) continue;

        const [schHour, schMinute] = schedule.time.split(":").map(Number);
        const minuteDiff = (currentHour * 60 + currentMinute) - (schHour * 60 + schMinute);

        if (minuteDiff >= 0 && minuteDiff < 10 && !sentLog.includes(schedule.time)) {
          console.log(`CRON: Sending for schedule ${schedule.time}`);
          await sendPostToChannel(botToken, settings);
          await addSentLog(env, schedule.time);
          console.log(`CRON: Sent successfully for ${schedule.time}`);
        }
      }
    } catch (error) {
      console.error("CRON ERROR:", error.message);
      const settings = await getSettings(env);
      await sendErrorToAdmin(env.BOT_TOKEN, settings.admin_id, error.message, "Cron Job (ارسال خودکار)");
    }
  }
};
