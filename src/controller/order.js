const bot = require('../index');
const helper = require('../helper');
const Form = require('../model/order.model');

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
          bot.sendMessage(id, `Укажите адрес доставки`, replyMarkup)
            .then(msg => {
              const replyId = bot.onReplyToMessage(id, msg.message_id, msg => {
                user.set('address', msg.text).save()
                bot.removeReplyListener(replyId)
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
      })
  } catch (error) {
    console.error(error)
  }



  //return bot.sendMessage(id, `Укажите адрес доставки`)
  // Form.findOne({chat: id})
  //   .then(us => {
  //
  //     //Add user ID to database if he doesn't exists
  //     if (!us) {
  //       let user = new Form({
  //         chat: id
  //       }).save()
  //     }
  //   });
  //
  // //First question
  // bot.sendMessage(id, `Как Ваше имя?`, {
  //     reply_markup: {
  //       force_reply: true
  //     }
  //   })
  //
  //
  //       ///////// Second question
  //
  //       bot.sendMessage(id, `Укажите адрес доставки`, {
  //           reply_markup: {
  //             force_reply: true
  //           }
  //         })
  //         .then(msg => {
  //           const replyId = bot.onReplyToMessage(id, msg.message_id, msg => {
  //
  //             Form.findOne({chat: id}).then((f) => {
  //
  //               //Check if name exists
  //               if (f.name) {
  //                 //Add user's address to database
  //
  //                 if (!f.address) {
  //                   f.set("address", msg.text).save();
  //                 }
  //
  //                 bot.removeReplyListener(replyId);
  //
  //                 ////////////////// Third question
  //
  //                 bot.sendMessage(id, `Ваш номер телефона)`, {reply_markup: {force_reply: true}})
  //                   .then(msg => {
  //
  //                     const replyId = bot.onReplyToMessage(id, msg.message_id, msg => {
  //
  //                       //Check if name and address exists
  //                       if (f.name && f.address) {
  //                         //Add user's phone to database
  //
  //                         if (!f.phone) {
  //                           f.set("phone", msg.text).save();
  //                         }
  //
  //                         bot.removeReplyListener(replyId);
  //
  //                         //Send confirmation
  //                         bot.sendMessage(id, `Ваш заказ принят!\nВ ближайшее время с Вами свяжется наш менеджер.`, {
  //                           reply_markup: {
  //                             keyboard: keyboard.home,
  //                             resize_keyboard: true
  //                           }
  //                         });
  //
  //                         //Send info to bot's owner
  //                         bot.sendMessage(447069712, helper.html(f), {parse_mode: 'HTML'});
  //
  //                         //if at least one field is empty, suggest to repeat
  //                       } else if (f.name && !f.address || !f.name && f.address || !f.name && !f.address) {
  //                         bot.sendMessage(id, `Заполнить данные по новой?`, {
  //                           reply_markup: {
  //                             keyboard: [
  //                               ['Да', 'Пошел нахуй']
  //                             ],
  //                             resize_keyboard: true
  //                           }
  //                         });
  //                       }
  //                     })
  //                   })
  //
  //                 //check if name exists
  //               } else {
  //                 bot.sendMessage(id, `Имя, сука!!!`, {
  //                   reply_markup: {
  //                     keyboard: [
  //                       ['Да', 'Пошел нахуй']
  //                     ],
  //                     resize_keyboard: true
  //                   }
  //                 });
  //                 return false
  //               }
  //             })
  //           })
  //         })
  //     })
  //   })
};