const bot = require('../index')
const Form = require('../model/order.model')

module.exports = async (id) => {
  try {
    const user = await Form.findOne({id: id})
    if (!user) {
      new Form({id: id}).save()
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
      }).then(() => bot.sendMessage(447069712, `Новый заказ!`))
  } catch (error) {
    console.error(error)
  }
}