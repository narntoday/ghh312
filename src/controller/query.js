const bot = require('../index')
const Flower = require('../model/flower.model')
const rub = require('../globals').rub
const limit = require('../globals').limit

module.exports = {
  findFlower(query, userId) {
    console.log('query =', query)
    Flower.findOne({uid: query}).then(f => {
      const description = f.description !== undefined ? f.description.split(', ').join('\n') : null
      const caption = description !== null ? `<b>${f.title}</b>\n<b>Цена ${f.price} ${rub}</b>\n\n<em>Описание:</em>\n${description}`
                                           : `<b>${f.title}</b>\n<b>Цена ${f.price} ${rub}</b>`

      return bot.sendPhoto(userId, f.image, {
        caption: caption,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {text: `➖`, callback_data: `delete /f${f.uid}`},
              {text: '🛒', callback_data: 'cart'},
              {text: `➕`, callback_data: `add /f${f.uid}`}
            ]
          ]
        }
      })
    }).catch(err => console.log(err))
  },
  findByQuery(user, query) {
    let page = user.pages[query]

    Flower.count({category: query}).then(number => {
      const pageTotal = Math.ceil(number/limit)

      if ((limit * (page - 1)) < number) {
        Flower.find({category: query}).limit(limit).skip(limit * (page - 1)).then(result => {

          const promises = result.map(flower => {
            return bot.sendPhoto(user.userId, flower.image, {
              caption: `<b>${flower.title}</b>\n<b>Цена ${flower.price} ${rub}</b>`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    {text: `➖`, callback_data: `delete /f${flower.uid}`},
                    {text: '🛒️', callback_data: 'cart'},
                    {text: `➕`, callback_data: `add /f${flower.uid}`}
                  ],
                  [
                    {text: '🌷 Подробнее', callback_data: `/f${flower.uid}`}
                  ]
                ]
              }
            })
          })

          Promise.all(promises)
            .then(() => {
              let inlineKeyboard = []
              if (page > 1 && page !== pageTotal) {
                inlineKeyboard = [
                  [{text: '️️⬅️  Предыдущая', callback_data: `less ${query}`}],
                  [{text: 'Следующая ➡', callback_data: `more ${query}`}]
                ]
              } else if (page === 1) {
                inlineKeyboard = [
                  [{text: 'Следующая ➡️️', callback_data: `more ${query}`}]
                ]
              } else if (page === pageTotal) {
                inlineKeyboard = [
                  [{text: '️️⬅️  Предыдущая', callback_data: `less ${query}`}],
                  [{text: '️️🚀 В начало', callback_data: `start ${query}`}]
                ]
              }
              return bot.sendMessage(user.userId, `Показано ${(limit*page) >= number ? number : (limit*page)} элементов из ${number}\nСтраница ${page} из ${pageTotal}`, {
                reply_markup: {
                  inline_keyboard: inlineKeyboard
                }
              })
            })
            .catch(err => console.log(err))
        }).catch(err => console.log(err))
      } else {
        return bot.sendMessage(user.userId, `В данной категории элементов больше нет ☹️\nВыберите другую категорию или вернитесь назад`, {
          reply_markup: {
            inline_keyboard: [
              [{text: '️️⬅️ Предыдущая', callback_data: `less ${query}`}],
              [{text: '️️🚀 В начало', callback_data: `start ${query}`}],
            ]
          }
        })
      }
    }).catch(err => console.log(err))
  },
  async findByPrice (user, query, cb_data) {
    let count, result,
        page = user.pagesPrice[query]

    switch (cb_data) {
      case 'b_low':
      case 'c_low':
      case 'g_low':
        count = await Flower.count({category: query}).where('price').lte(2000)
        break
      case 'b_midlow':
      case 'c_midlow':
      case 'g_midlow':
        count = await Flower.count({category: query}).where('price').gt(2000).lte(3500)
        break
      case 'b_midhigh':
      case 'c_midhigh':
      case 'g_midhigh':
        count = await Flower.count({category: query}).where('price').gte(3500).lte(5000)
        break
      case 'b_high':
      case 'c_high':
      case 'g_high':
        count = await Flower.count({category: query}).where('price').gt(5000)
        break
    }

    if (count === 0) {
      return bot.sendMessage(user.userId, `По Вашему запросу ничего не найдено. Выберите другие критерии`)
    }

    if ((limit * (page - 1)) < count) {
      switch (cb_data) {
        case 'b_low':
        case 'c_low':
        case 'g_low':
          result = await Flower.find({category: query}).where('price').lte(2000).limit(limit).skip(limit*(page-1))
          break
        case 'b_midlow':
        case 'c_midlow':
        case 'g_midlow':
          result = await Flower.find({category: query}).where('price').gt(2000).lte(3500).limit(limit).skip(limit*(page-1))
          break
        case 'b_midhigh':
        case 'c_midhigh':
        case 'g_midhigh':
          result = await Flower.find({category: query}).where('price').gte(3500).lte(5000).limit(limit).skip(limit*(page-1))
          break
        case 'b_high':
        case 'c_high':
        case 'g_high':
          result = await Flower.find({category: query}).where('price').gt(5000).limit(limit).skip(limit*(page-1))
          break
      }
    } else {
      return bot.sendMessage(user.userId, `В данной категории элементов больше нет ☹️\nВыберите другую категорию или вернитесь назад`, {
        reply_markup: {
          inline_keyboard: [
            [{text: '️️⬅️ Предыдущая', callback_data: `lessPrice ${cb_data}`}],
            [{text: '️️🚀 В начало', callback_data: `startPrice ${cb_data}`}],
          ]
        }
      })
    }

    const pageTotal = Math.ceil(count/limit)
    const promises = result.map(flower => {
      return bot.sendPhoto(user.userId, flower.image, {
        caption: `<b>${flower.title}</b>\n<b>Цена ${flower.price} ${rub}</b>`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {text: `➖`, callback_data: `delete /f${flower.uid}`},
              {text: '🛒️', callback_data: 'cart'},
              {text: `➕`, callback_data: `add /f${flower.uid}`}
            ],
            [
              {text: '🌷 Подробнее', callback_data: `/f${flower.uid}`}
            ]
          ]
        }
      })
    })

    Promise.all(promises)
      .then(() => {
        let inlineKeyboard = []
        if (page > 1 && page !== pageTotal) {
          inlineKeyboard = [
            [{text: '️️⬅️ Предыдущая', callback_data: `lessPrice ${cb_data}`}],
            [{text: 'Следующая ➡', callback_data: `morePrice ${cb_data}`}]
          ]
        } else if (page === 1) {
          inlineKeyboard = [
            [{text: 'Следующая ➡️️', callback_data: `morePrice ${cb_data}`}]
          ]
        } else if (page === pageTotal) {
          inlineKeyboard = [
            [{text: '️️⬅️ Предыдущая', callback_data: `lessPrice ${cb_data}`}],
            [{text: '️️🚀 В начало', callback_data: `startPrice ${cb_data}`}]
          ]
        }
        return bot.sendMessage(user.userId, `Показано ${(limit*page) >= count ? count : (limit*page)} элементов из ${count}\nСтраница ${page} из ${pageTotal}`, {
          reply_markup: {
            inline_keyboard: inlineKeyboard
          }
        })
    }).catch(err => console.log(err))
  },
  async findByReason (user, cb_data) {
    let query = cb_data.substr(0,1) === 'b' ? 'bouquets' : 'compose',
        page = user.pagesReason[query],
        count, result

    switch (cb_data) {
      case 'b_birthday':
      case 'c_birthday':
        count = await Flower.count({category: query, reason: 'birthday'})
        break
      case 'b_jubilee':
      case 'c_jubilee':
        count = await Flower.count({category: query, reason: 'jubilee'})
        break
      case 'b_wedding':
      case 'c_wedding':
        count = await Flower.count({category: query, reason: 'wedding'})
        break
      case 'b_love':
      case 'c_love':
        count = await Flower.count({category: query, reason: 'love'})
        break
    }

    if (count === 0) {
      return bot.sendMessage(user.userId, `По Вашему запросу ничего не найдено. Выберите другие критерии`)
    }

    if ((limit * (page - 1)) < count) {
      switch (cb_data) {
        case 'b_birthday':
        case 'c_birthday':
          result = await Flower.find({category: query, reason: 'birthday'}).limit(limit).skip(limit*(page-1))
          break
        case 'b_jubilee':
        case 'c_jubilee':
          result = await Flower.find({category: query, reason: 'jubilee'}).limit(limit).skip(limit*(page-1))
          break
        case 'b_wedding':
        case 'c_wedding':
          result = await Flower.find({category: query, reason: 'wedding'}).limit(limit).skip(limit*(page-1))
          break
        case 'b_love':
        case 'c_love':
          result = await Flower.find({category: query, reason: 'love'}).limit(limit).skip(limit*(page-1))
          break
      }
    } else {
      return bot.sendMessage(user.userId, `В данной категории элементов больше нет ☹️\nВыберите другую категорию или вернитесь назад`, {
        reply_markup: {
          inline_keyboard: [
            [{text: '️️⬅️ Предыдущая', callback_data: `lessReason ${cb_data}`}],
            [{text: '️️🚀 В начало', callback_data: `startReason ${cb_data}`}]
          ]
        }
      })
    }

    const pageTotal = Math.ceil(count/limit)
    const promises = result.map(flower => {
      return bot.sendPhoto(user.userId, flower.image, {
        caption: `<b>${flower.title}</b>\n<b>Цена ${flower.price} ${rub}</b>`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {text: `➖`, callback_data: `delete /f${flower.uid}`},
              {text: '🛒️', callback_data: 'cart'},
              {text: `➕`, callback_data: `add /f${flower.uid}`}
            ],
            [{text: '🌷 Подробнее', callback_data: `/f${flower.uid}`}]
          ]
        }
      })
    })

    Promise.all(promises)
      .then(() => {
        let inlineKeyboard = []
        if (page > 1 && page !== pageTotal) {
          inlineKeyboard = [
            [{text: '️️⬅️ Предыдущая', callback_data: `lessReason ${cb_data}`}],
            [{text: 'Следующая ➡', callback_data: `moreReason ${cb_data}`}]
          ]
        } else if (page === 1) {
          inlineKeyboard = [
            [{text: 'Следующая ➡️️', callback_data: `moreReason ${cb_data}`}]
          ]
        } else if (page === pageTotal) {
          inlineKeyboard = [
            [{text: '️️⬅️ Предыдущая', callback_data: `lessReason ${cb_data}`}],
            [{text: '️️🚀 В начало', callback_data: `startReason ${cb_data}`}]
          ]
        }
        return bot.sendMessage(user.userId, `Показано ${(limit*page) >= count ? count : (limit*page)} элементов из ${count}\nСтраница ${page} из ${pageTotal}`, {
          reply_markup: {
            inline_keyboard: inlineKeyboard
          }
        })
    }).catch(err => console.log(err))
  }
}