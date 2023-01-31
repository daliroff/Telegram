import telebot
import sqlite3
from telebot import types

bot = telebot.TeleBot("1176972608:AAHcIepUT9iM7Pi6H2cBv3KO3bwXRkh1gK0")
conn = sqlite3.connect("inventory.db")

def create_table():
    conn.execute("CREATE TABLE IF NOT EXISTS items (item TEXT, price INTEGER)")

@bot.message_handler(commands=['start'])
def start_handler(message):
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True, selective=True)
    markup.add("Buy Item", "Sell Item")
    bot.send_message(chat_id=message.from_user.id, text="Welcome! Choose an option.", reply_markup=markup)

@bot.message_handler(func=lambda message: message.text == "Buy Item")
def buy_handler(message):
    bot.send_message(chat_id=message.from_user.id, text="Which item would you like to buy?")

@bot.message_handler(func=lambda message: message.text == "Sell Item")
def sell_handler(message):
    bot.send_message(chat_id=message.from_user.id, text="What is the name and price of the item you want to sell?")

@bot.message_handler(func=lambda message: "buy" in message.text.lower())
def buy_confirm_handler(message):
    parts = message.text.split(" ")
    item = parts[1]
    cursor = conn.execute("SELECT price FROM items WHERE item=?", (item,))
    row = cursor.fetchone()

    if row is None:
        bot.send_message(chat_id=message.from_user.id, text="Item not found.")
    else:
        price = row[0]
        bot.send_message(chat_id=message.from_user.id, text="Item found for {} coins. Do you want to buy it?".format(price))
        markup = types.ReplyKeyboardMarkup(resize_keyboard=True, selective=True)
        markup.add("Yes", "No")
        bot.send_message(chat_id=message.from_user.id, text="Do you want to buy it?", reply_markup=markup)

@bot.message_handler(func=lambda message: "sell" in message.text.lower())
def sell_confirm_handler(message):
    parts = message.text.split(" ")
    item = parts[1]
    price = parts[2]

    conn.execute("INSERT INTO items (item, price) VALUES (?, ?)", (item, price))
    conn.commit()

    bot.send_message(chat_id=message.from_user.id, text="Item sold.")

create_table()
bot.polling()
