const bot = require('../index')
const Flower = require('../model/flower.model')
const rub = require('../globals').rub

module.exports = {
  async addToCart (item, user) {
    try {
      const flower = await Flower.findOne({uid: item})
      if (user.cart.length === 1) {
        await user.cart.push({
          uid: item,
          title: flower.title,
          image: flower.image,
          price: flower.price
        })
        user.save()
      } else if (user.cart.length > 1) {
        const found = user.cart.slice(1).some(el => el.uid === item)
        if (!found) {
          user.cart.push({
            uid: item,
            title: flower.title,
            image: flower.image,
            price: flower.price
          })
          user.save()
        } else {
          const subDoc = user.cart.find(el => el.uid === item)
          user.cart.id(subDoc._id).set({quantity: subDoc.quantity + 1})
          user.save()
        }
      }
    } catch (error) {
      console.log(error)
    }
  },
  removeFromCart (item, user) {
    try {
      const found = user.cart.slice(1).some(el => el.uid === item)
      if (found) {
        const subDoc = user.cart.find(el => el.uid === item)
        if (subDoc.quantity === 1) {
          user.cart.id(subDoc._id).remove()
          user.save()
        } else {
          user.cart.id(subDoc._id).set({quantity: subDoc.quantity - 1})
          user.save()
        }
      }
    } catch (error) {
      console.log(error)
    }
  },
  showCart (user) {
    if (user.cart.length > 1) {
      bot.sendMessage(user.userId, `Ваш заказ`)
        .then(() => {
          // every promise should be returned in promise.all
          Promise.all(user.cart.slice(1).map(flower => {
            return bot.sendPhoto(user.userId, flower.image, {
              caption: `<b>${flower.title}</b> - <em>${flower.quantity} шт.</em> \n<b>Цена ${flower.price} ${rub}</b>`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{text: '🌹 Подробнее', callback_data: `/f${flower.uid}`}]
                ]
              }
            })
          })).then(() => {
            const price = this.getTotalPrice(user)
            return bot.sendMessage(user.userId, `Общая сумма Вашего заказа составляет <b>${typeof(price) === 'number' ? price : price.total} ${rub}</b>`, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{text: `🗑️ Очистить корзину`, callback_data: 'clear'}],
                  [{text: `🌸 Оформить заказ`, callback_data: 'order'}]
                ]
              }
            })
          })
        }).catch(err => console.log(err))
    } else {
      return bot.sendMessage(user.userId, `Корзина пуста`)
    }
  },
  getTotalPrice (user) {
    const prices = user.cart.slice(1).map(item => {
      return {
        price: item.price,
        quantity: item.quantity
      }
    })
    prices.map(el => el.total = el.price * el.quantity)
    return prices.reduce((a, b) => a.total + b.total)
  },
  clearCart (user) {
    user.cart = {}
    user.save()
  }
}