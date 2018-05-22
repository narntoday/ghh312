const bot = require('../index');
const helper = require('../helper');
const Flower = require('../model/flower.model');
const globals = require('../globals');
const rub = globals.rub;

module.exports = {
  async addToCart (item, user) {
    try {
      const flower = await Flower.findOne({uid: item});
      if (user.cart.length === 1) {
        await user.cart.push({uid: item, price: flower.price, quantity: 1});
        user.save();
      } else if (user.cart.length > 1) {
        const found = user.cart.slice(1).some(el => el.uid === item);
        if (!found) {
          user.cart.push({uid: item, price: flower.price, quantity: 1});
          user.save()
        } else {
          const subDoc = user.cart.find(el => el.uid === item);
          user.cart.id(subDoc._id).set({quantity: subDoc.quantity + 1});
          user.save()
        }
      }
    } catch (error) {
      console.log(error)
    }
  },
  removeFromCart (item, user) {
    try {
      const found = user.cart.slice(1).some(el => el.uid === item);
      if (!found) {
        return bot.sendMessage(user.userId, `В вашей корзине данного товара нет`)
      } else {
        const subDoc = user.cart.find(el => el.uid === item);
        if (subDoc.quantity === 1) {
          user.cart.id(subDoc._id).remove();
          user.save()
        } else {
          user.cart.id(subDoc._id).set({quantity: subDoc.quantity - 1});
          user.save()
        }
      }
    } catch (error) {
      console.log(error)
    }
  },
  showCart (user) {
    if (user.cart.length > 1) {
      bot.sendMessage(user.userId, `Ваш заказ`).then(() => {
        // you should return every promise in promise.all
        Promise.all(user.cart.slice(1).map(function (item) {
          return Flower.findOne({uid: item.uid.substr(2)}).then(flower => {
            return bot.sendPhoto(user.userId, flower.image, {
              caption: `<b>${flower.title}</b> - /f${flower.uid}\n<b>Цена ${flower.price} ${rub}</b>\n${flower.descr}`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{text: `🗑️ Убрать из корзины`, callback_data: 'delete'}]
                ]
              }
            });
          }).catch(err => console.log(err));
        })).then(() => {
          let price = helper.getTotalPrice(user.cart.slice(1));
          return bot.sendMessage(user.userId, `Общая сумма Вашего заказа составляет <b>${price} ${rub}</b>`, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{text: `❌ Очистить корзину`, callback_data: 'clear'}],
                [{text: `🌸 Оформить заказ`, callback_data: 'order'}]
              ]
            }
          })
        }).catch(err => console.log(err));
      }).catch(err => console.log(err));
    } else {
      return bot.sendMessage(user.userId, `Корзина пуста`);
    }
  },
  clearCart (user) {
    user.cart = {};
    user.save()
  }
};