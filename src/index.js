// ==========================================
// 🎯 نقطه ورود اصلی ورکر - نسخه کامل چندمنبعی
// ==========================================

import { getSettings, saveSettings, getSentLog, addSentLog } from './services/kv.js';
import { fetchAllPrices, testSymbolDiagnostics } from './services/priceEngine.js';
import { sendTelegramMessage, sendErrorToAdmin } from './services/telegram.js';
import { generateCaption, sendPostToChannel } from './core/post.js';
import { renderLoginPage } from './ui/auth.js';
import { renderDashboardSPA } from './ui/dashboard.js';

async function getAuthHash(password) {
  const enc = new TextEncoder().encode(password + "_rate_bazar_secure_salt");
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const botToken = env.BOT_TOKEN;

    if (!botToken) {
      return new Response("⚠️ BOT_TOKEN تنظیم نشده است.", { status: 500 });
    }

    const settings = await getSettings(env);
    const adminPassword = env.ADMIN_PASSWORD;

    // لاگین
    if (url.pathname === "/admin/login" && request.method === "POST") {
      const formData = await request.formData();
      const enteredPass = formData.get("password");

      if (adminPassword && enteredPass === adminPassword) {
        const token = await getAuthHash(adminPassword);
        return new Response(null, {
          status: 302,
          headers: {
            "Location": "/admin",
            "Set-Cookie": `admin_auth=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax`
          }
        });
      }
      return new Response(renderLoginPage("❌ رمز عبور اشتباه است."), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // خروج
    if (url.pathname === "/logout") {
      return new Response(null, {
        status: 302,
        headers: { "Location": "/admin", "Set-Cookie": "admin_auth=; Path=/; Max-Age=0" }
      });
    }

    // احراز هویت ادمین
    const isAdminRoute = url.pathname === "/" || url.pathname === "/admin" || url.pathname.startsWith("/api/");
    if (isAdminRoute) {
      if (!adminPassword) {
        return new Response(renderLoginPage("⚠️ رمز ADMIN_PASSWORD تنظیم نشده است."), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      const cookies = request.headers.get("Cookie") || "";
      const expectedToken = await getAuthHash(adminPassword);
      if (!cookies.includes(`admin_auth=${expectedToken}`)) {
        return new Response(renderLoginPage(), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
    }

    // داشبورد SPA
    if (url.pathname === "/admin" || url.pathname === "/") {
      return new Response(renderDashboardSPA(settings), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // ذخیره تنظیمات
    if (url.pathname === "/api/settings" && request.method === "POST") {
      try {
        const newSettings = await request.json();
        await saveSettings(env, newSettings);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), {
          status: 500, headers: { "Content-Type": "application/json" }
        });
      }
    }

    // تست اختصاصی تمام منابع یک نماد
    if (url.pathname === "/api/test-symbol" && request.method === "POST") {
      try {
        const payload = await request.json();
        const symbol = payload.symbol;
        const diagnostics = await testSymbolDiagnostics(symbol);
        return new Response(JSON.stringify({ ok: true, diagnostics }), {
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), {
          status: 500, headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }
    }

    // پیش‌نمایش کپشن
    if (url.pathname === "/api/preview") {
      try {
        const priceResults = await fetchAllPrices(settings, env);
        const caption = await generateCaption(settings, priceResults);
        return new Response(JSON.stringify({ ok: true, caption }), {
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), {
          status: 500, headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }
    }

    // ارسال دستی
    if (url.pathname === "/send") {
      try {
        await sendPostToChannel(botToken, settings, env);
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

    // تست قیمت‌ها به صورت خلاصه
    if (url.pathname === "/test-api") {
      try {
        const priceResults = await fetchAllPrices(settings, env);
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

    // وب‌هوک تلگرام
    if (request.method === "POST") {
      try {
        const update = await request.json();
        let chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
        let text = update.message?.text || update.callback_query?.data;
        let callbackId = update.callback_query?.id;

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
            const msg = `سلام مدیر گرامی! 👋\nربات فعال است.\nکانال: ${settings.channel_id}`;
            await sendTelegramMessage(botToken, chatId, msg, {
              reply_markup: {
                inline_keyboard: [[{ text: "📤 ارسال هم‌اکنون به کانال", callback_data: "/send" }]]
              }
            });
          } else if (text === "/send") {
            await sendTelegramMessage(botToken, chatId, "⏳ در حال ارسال به کانال...");
            try {
              await sendPostToChannel(botToken, settings, env);
              await sendTelegramMessage(botToken, chatId, "✅ با موفقیت در کانال منتشر شد!");
            } catch (error) {
              await sendTelegramMessage(botToken, chatId, `❌ خطا:\n${error.message}`);
              await sendErrorToAdmin(botToken, settings.admin_id, error.message, "دستور تلگرام /send");
            }
          }
        }
        return new Response("OK", { status: 200 });
      } catch (error) {
        return new Response("Error", { status: 500 });
      }
    }

    return new Response(`🤖 ربات قیمت‌دهی فعال است.\nکانال: ${settings.channel_id}\nپنل: /admin`, {
      status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  },

  // کرون‌جاب
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

      const [currentHour, currentMinute] = tehranNow.split(":").map(Number);
      const sentLog = await getSentLog(env);

      for (const schedule of settings.schedules) {
        if (!schedule.enabled) continue;

        const [schHour, schMinute] = schedule.time.split(":").map(Number);
        const minuteDiff = (currentHour * 60 + currentMinute) - (schHour * 60 + schMinute);

        if (minuteDiff >= 0 && minuteDiff < 10 && !sentLog.includes(schedule.time)) {
          console.log(`CRON: زمان ارسال فرا رسید (${schedule.time})`);
          await sendPostToChannel(botToken, settings, env);
          await addSentLog(env, schedule.time);
        }
      }
    } catch (error) {
      console.error("CRON ERROR:", error.message);
      const settings = await getSettings(env);
      await sendErrorToAdmin(env.BOT_TOKEN, settings.admin_id, error.message, "ارسال خودکار Cron");
    }
  }
};
