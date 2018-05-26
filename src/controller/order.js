const bot = require('../index')
const Form = require('../model/order.model')
const User = require('../model/user.model')

module.exports = async (id) => {
  try {
    const user = await Form.findOne({id: id})
    if (!user) {
      new Form({id: id}).save()
    } else if (user.name && user.address && user.phone) {
      const question = `Вы уже делали заказ. Использовать ранее введённые данные?\n\n<b>Имя:</b>${user.name}\n<b>Адрес доставки:</b>${user.address}\n<b>Телефон:</b>${user.phone}`
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
                    })
                  })
              })
            })
        })
        User.findOne({userId: user.id}).then(user => {
          console.log(user)
          const text = user.cart.slice(1).map(item => `<b>${item.title}</b>`).join('\n')
          return bot.sendMessage(447069712, `Новый заказ!\n${text}`)
        })
      })
  } catch (error) {
    console.error(error)
  }
}