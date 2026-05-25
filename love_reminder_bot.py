import telebot
import schedule
import time
import random
import threading
import os
from datetime import datetime

# =============================================
#  SOZLAMALAR — shu yerdan o'zgartiring
# =============================================
BOT_TOKEN   = os.getenv("LOVE_BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
LOVER_CHAT_ID = os.getenv("LOVER_CHAT_ID", "YOUR_LOVER_CHAT_ID_HERE")

MORNING_TIME  = "08:00"   # Ertalabki xabar vaqti
EVENING_TIME  = "21:00"   # Kechki xabar vaqti
MIDDAY_TIME   = "13:00"   # Tushlik vaqti xabari
# =============================================

bot = telebot.TeleBot(BOT_TOKEN)

ERTALAB_XABARLARI = [
    "Xayrli tong, mening yagona sevgilim! 🌸\nSen uyg'ongan har bir kun men uchun bayram. Bugun ham go'zal kun bo'lsin, chunki sen borsan! 💕",
    "Ertalab ko'zlarimni ochganimda birinchi o'ylaydigan narsa — sen. 🌞\nYaxshi tong, jonim! Seni juda ko'p yaxshi ko'raman! 💗",
    "Hayotimning eng chiroyli qismi — sening borliging. 🌷\nXayrli tong, azizim! Bugun ham seni o'ylab yashayapman!",
    "Seni yaxshi ko'raman — bu so'zlarni har ertalab aytgim keladi. 🌻\nXayrli tong, suyuklim! Kun davomida o'zingni ehtiyot qil! 💖",
    "Sen mening hayotimga nur bag'ishlaysan. ☀️\nXayrli tong, mehrliginam! Bugun ajoyib kun bo'lishi uchun ishonaman!",
    "Har bir tong seni ko'rish xayoli bilan boshlanadi. 🌺\nXayrli tong, jonim! Sen bor ekan, dunyo go'zal! 💝",
    "Sening tabassuming meni kuchli qiladi. 😊\nXayrli tong, azizim! Bugun ham chiroyli kuningiz o'tsin! 💕",
    "Mening yulduzim, mening quyoshim — bu sensan! ⭐\nXayrli tong, suyuklim! Hamma narsaning eng yaxshisiga loyiqsan! 🌟",
]

KECHKI_XABARLARI = [
    "Bugun ham o'tdi, lekin seni o'ylagan vaqtlarim hisob-kitobsiz edi. 🌙\nXayrli kech, mening eng sevgilim! Charchagan bo'lsang ham, bilginki — men seni kutib turibman! 💗",
    "Yulduzlar chiqdi, oy charaqlab turibdi — lekin ularning barchasi senga o'xshab go'zal emas. 🌟\nXayrli kech, jonim! Tushlaringiz shirin bo'lsin! 💕",
    "Kechqurun bo'ldi, ko'zlarimni yumganimda yolg'iz seni ko'raman. 🌃\nXayrli kech, azizim! Seni sog'indim! 💝",
    "Bugungi kuning qanday o'tdi? Qanday bo'lmasin — men doim yoningdaman. 🤗\nXayrli kech, suyuklim! Dam oling! 💖",
    "Tungi osmon singari — mening sevgim sening uchun cheksiz. 🌌\nXayrli kech, mehrliginam! Tushlaringizda men bilan bo'ling! 💗",
    "Kun tugayapti, lekin seni sevishim hech qachon tugamaydi. ♾️\nXayrli kech, jonim! Yaxshi dam oling! 🌙",
    "Bu kecha ham seni o'ylab uxlayapman. 💭\nXayrli kech, azizim! Seni yaxshi ko'raman — bugungi kabi, ertaga ham! 💕",
    "Sening ovozingni eshitgim, qo'lingni ushlagim kelmoqda. 🥰\nXayrli kech, mening yagona qalbim! Tezda ko'rishamiz! 💝",
]

TUSHLIK_XABARLARI = [
    "Tushlik paytingizni eslatmoqchi edim — ovqatlandingizmi? 🍽️\nO'zingizni qiynamang, men siz haqingizda qayguraman! 💕",
    "Kun o'rtasida ham sizni o'ylayman. 💭\nHech bo'lmaganda bir piyola choy iching! ☕ Sog'liqni saqlang, jonim!",
    "Mening suyuklim, ovqat yedingizmi? 🥗\nO'zingizni asrang — siz mening uchun eng muhim odamsiz! 💗",
    "Tushlik eslatmasi: avval ovqatlaning, keyin ishlang! 😄\nSiz sog'-salom bo'lsangiz, men xursandman! 💖",
]

KUTILMAGAN_SEVGI_XABARLARI = [
    "Birdan seni o'ylab qoldim... Seni juda yaxshi ko'raman! 💓",
    "Sen dunyodagi eng ajoyib insonsan. Buni bilishingni xohladim. 🌹",
    "Sening kulishingni eshitgim kelmoqda. Tez kel! 😄💕",
    "Hayotimga sen kelganingga minnatdorman. Har kuni! 🙏💗",
    "Sen meninsiz ham kuchli, lekin men sensiz bo'sh. 💝",
    "Seni o'ylagan sayin yuragim to'lib ketadi. 💞",
    "Mening baxtiyor bo'lishimning sababi — sensan. ✨",
]

def tasodifiy_xabar_yuborish(xabarlar_royxati: list[str]) -> None:
    xabar = random.choice(xabarlar_royxati)
    try:
        bot.send_message(LOVER_CHAT_ID, xabar, parse_mode=None)
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] Xabar yuborildi ✓")
    except Exception as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] Xatolik: {e}")

def ertalab_xabar():
    tasodifiy_xabar_yuborish(ERTALAB_XABARLARI)

def kechki_xabar():
    tasodifiy_xabar_yuborish(KECHKI_XABARLARI)

def tushlik_xabar():
    tasodifiy_xabar_yuborish(TUSHLIK_XABARLARI)

def kutilmagan_sevgi():
    # Faqat 30% ehtimollik bilan kutilmagan xabar yuboradi (har 3 soatda bir)
    if random.random() < 0.30:
        tasodifiy_xabar_yuborish(KUTILMAGAN_SEVGI_XABARLARI)

schedule.every().day.at(MORNING_TIME).do(ertalab_xabar)
schedule.every().day.at(EVENING_TIME).do(kechki_xabar)
schedule.every().day.at(MIDDAY_TIME).do(tushlik_xabar)
schedule.every(3).hours.do(kutilmagan_sevgi)

# ── Bot komandalar ──────────────────────────────────────────────────────────

@bot.message_handler(commands=["start"])
def start(message):
    bot.send_message(
        message.chat.id,
        "💌 Sevgi eslatma boti ishlamoqda!\n\n"
        "📋 Komandalar:\n"
        "/id — Chat ID ni ko'rish\n"
        "/yuborish — Hoziroq sevgi xabar yuborish\n"
        "/vaqtlar — Xabar vaqtlarini ko'rish"
    )

@bot.message_handler(commands=["id"])
def show_id(message):
    bot.send_message(message.chat.id, f"Sizning Chat ID: `{message.chat.id}`", parse_mode="Markdown")

@bot.message_handler(commands=["yuborish"])
def send_now(message):
    tasodifiy_xabar_yuborish(ERTALAB_XABARLARI + KECHKI_XABARLARI + KUTILMAGAN_SEVGI_XABARLARI)
    bot.send_message(message.chat.id, "✅ Sevgi xabari yuborildi!")

@bot.message_handler(commands=["vaqtlar"])
def show_times(message):
    bot.send_message(
        message.chat.id,
        f"⏰ Xabar yuborish vaqtlari:\n\n"
        f"🌅 Ertalab: {MORNING_TIME}\n"
        f"☀️ Tushlik: {MIDDAY_TIME}\n"
        f"🌙 Kechqurun: {EVENING_TIME}\n"
        f"💫 Kutilmagan: har 3 soatda (30% ehtimollik)"
    )

# ── Ishga tushirish ─────────────────────────────────────────────────────────

def jadval_ishlatish():
    while True:
        schedule.run_pending()
        time.sleep(30)

if __name__ == "__main__":
    print("💌 Sevgi eslatma boti ishga tushdi!")
    print(f"   Ertalab:   {MORNING_TIME}")
    print(f"   Tushlik:   {MIDDAY_TIME}")
    print(f"   Kechqurun: {EVENING_TIME}")
    print("   Toxtatish uchun: Ctrl+C\n")

    jadval_oqimi = threading.Thread(target=jadval_ishlatish, daemon=True)
    jadval_oqimi.start()

    bot.infinity_polling()
