const bot = require('../index')
const Form = require('../model/order.model')
const User = require('../model/user.model')
const CartController = require('../controller/cart')

module.exports = {
  async processOrder(id) {
    try {
      const user = await Form.findOne({id: id})
      if (!user) {
        new Form({id: id}).save()
      } else if (user.name && user.address && user.phone) {
        const question = `Вы уже делали заказ. Использовать ранее введённые данные?\n\n<b>Имя:</b> ${user.name}\n<b>Адрес доставки:</b> ${user.address}\n<b>Телефон:</b> ${user.phone}`
        return bot.sendMessage(user.id, question, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{text: 'Данные верны', callback_data: 'use_exist_data'}],
              [{text: 'Ввести новые данные', callback_data: 'use_new_data'}]
            ]
          }
        })
      }

      const replyMarkup = {
        reply_markup: {
          force_reply: true
        }
      }

      // First question
      bot.sendMessage(id, `Как Ваше имя?`, replyMarkup)
          .then(async msg => {
            const user = await Form.findOne({id: id})
            const replyId = bot.onReplyToMessage(id, msg.message_id, msg => {
              user.set('name', msg.text).save()
              bot.removeReplyListener(replyId)

              // Second question
              bot.sendMessage(id, `Укажите адрес доставки`, replyMarkup)
                  .then(msg => {
                    const replyId = bot.onReplyToMessage(id, msg.message_id, msg => {
                      user.set('address', msg.text).save()
                      bot.removeReplyListener(replyId)

                      // Third question
                      bot.sendMessage(id, `Оставьте контактный номер телефона`, replyMarkup)
                          .then(msg => {
                            const replyId = bot.onReplyToMessage(id, msg.message_id, msg => {
                              user.set('phone', msg.text).save()
                              bot.removeReplyListener(replyId)

                              // Send an order to manager
                              User.findOne({userId: user.id})
                                .then(existingUser => {
                                  const orderDetails = existingUser.cart.slice(1).map(item => `<em>${item.title}</em>`).join('\n')
                                  const userDetails = `<b>Имя:</b> ${user.name}\n<b>Адрес доставки:</b> ${user.address}\n<b>Телефон:</b> ${user.phone}`
                                  bot.sendMessage(447069712, `<b>Новый заказ!</b>\n\n${orderDetails}\n\n${userDetails}`, {parse_mode: 'HTML'})
                                    .then(() => {
                                      console.log(existingUser)
                                      bot.sendMessage(existingUser.userId, 'Спасибо за заказ! В ближайшее время с Вами свяжется наш менеджер.')
                                        .then(() => CartController.clearCart(existingUser))
                                    })
                                })
                            })
                          })
                    })
                  })
            })
          })
    } catch (error) {
      console.error(error)
    }
  },
  async useExistingData (user) {
    try {
      //const order = await Form.findOne({id: user.id})
      const existingUser = await User.findOne({userId: user.id})
      bot.sendMessage(existingUser, 'Спасибо за заказ! В ближайшее время с Вами свяжется наш менеджер.')
      const orderDetails = existingUser.cart.slice(1).map(item => `<em>${item.title}</em>`).join('\n')
      const userDetails = `<b>Имя:</b> ${user.name}\n<b>Адрес доставки:</b> ${user.address}\n<b>Телефон:</b> ${user.phone}`
      bot.sendMessage(447069712, `<b>Новый заказ!</b>\n\n${orderDetails}\n\n${userDetails}`, {parse_mode: 'HTML'})
        .then(() => CartController.clearCart(existingUser))
    } catch (error) {
      console.error(error)
    }
  }
}