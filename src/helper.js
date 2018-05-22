const mongoose = require ('mongoose');
require('./model/user.model');
const User = mongoose.model('users');
require('./model/flower.model');
const Flower = mongoose.model('flowers');

module.exports = {
  contacts: `Разработчик бота - @kravchenko_egor`,
  description: `Здравствуйте! Этот бот любезно поможет Вам выбрать цветы в нашем магазине, а затем оформить доставку в любую точку города.\n
Для Вашего удобства бот понимает следующие команды:
/start - начало работы
/help - список команд
/cart - корзина
/bouquets - букеты, которые Вы можете заказать в нашем магазине
/compose - композиции, которые Вы можете заказать в нашем магазине
/gifts - подарки, которые Вы можете заказать в нашем магазине
/reasons - букеты и композиции, специально отобранные на разные случаи жизни
/prices - ассортимент букетов и композиций, отсортированных по стоимости
/contacts - контакты нашего магазина\n\n
Надеемся, Вам понравится использование этого бота!`,
  logStart() {
    console.log('Bot has been started...')
  },
  getChatId(msg) {
    return msg.chat.id
  },
  html(query) {
    return `Новый заказ!\n<b>Имя:</b> ${query.name}\n<b>Адрес:</b> ${query.address}\n<b>Телефон:</b> ${query.phone}`
  },
  removeFromCart(item, user) {
    item = item.substr(item.indexOf('/f'), 5);

    User.findOne({userId: user}).then(user => {
      user.cart.slice(1).forEach(f => {
        if (f.uid === item && f.quantity === 1) {
          user.cart.id(f._id).remove();
          user.save()
        } else if ( f.uid === item && f.quantity > 1 ) {
          let q = f.quantity;
          user.cart.id(f._id).set({quantity: q-1});
          user.save();
        }
      });
    }).catch((err) => console.log(err))
  },

  getTotalPrice(arr) {
    var price = [];
    var result = 0;
    arr.forEach(item => {
      price.push((parseInt(item.price, 10))*item.quantity);
      return price;
    });
    price.forEach(p => {
      result += p;
    });
    return result;
  }
};