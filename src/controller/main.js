const bot = require('../index')
const helper = require('../helper')
const kb = require ('../keyboard-buttons')
const rub = require('../globals').rub

module.exports = {
  sendCallback (msg, item) {
    const id = helper.getChatId(msg)
    let text, keyboard

    switch (item) {
      case 'bouquets':
      case 'compose':
        text = `Хотите заказать ${item === 'compose' ? 'композицию' : 'букет'}?\nВы можете выбрать повод, на который Вы желаете ${item === 'compose' ? 'её' : 'его'} подарить , отсортировать ${item === 'compose' ? 'композиции' : 'букеты'} по стоимости, или посмотреть весь ассортимент`
        keyboard = {
          inline_keyboard: [
            [{text: `🎉 Выбрать повод`, callback_data: item === 'compose' ? 'c_reasons' : 'b_reasons'}],
            [{text: `💰 Выбрать цену`, callback_data: item === 'compose' ? 'c_price' : 'b_price'}],
            [{text: `🔍 Смотреть все`, callback_data: item === 'compose' ? 'c_all' : 'b_all'}]
          ]
        }
        break
      case 'gifts':
        text = `Хотите заказать подарок?\nВы можете уточнить желаемую стоимость, или посмотреть все подарки`
        keyboard = {
          inline_keyboard: [
            [{text: `💰 Выбрать цену`, callback_data: 'g_price'}],
            [{text: `🔍 Смотреть все`, callback_data: 'g_all'}]
          ]
        }
        break
    }

    return bot.sendMessage(id, text, { reply_markup: keyboard })
  },
  showReasons (id, query) {
    let item, keyboard
    item = query === 'bouquet' ? 'b' : 'c'
    keyboard = [
      [
        {text: kb.reasons.birthday, callback_data: `${item}_birthday`},
        {text: kb.reasons.jubilee, callback_data: `${item}_jubilee`}
      ],
      [
        {text: kb.reasons.wedding, callback_data: `${item}_wedding`},
        {text: kb.reasons.love, callback_data: `${item}_love`}

      ]
    ]

    return bot.sendMessage(id, `Выберите повод, на который хотите подарить ${item === 'b' ? 'букет' : 'композицию'}:`, {
      reply_markup: { inline_keyboard: keyboard }
    })
},
  choosePrice (msg) {
    let item = msg.data.substr(0,1)
    return bot.sendMessage(msg.message.chat.id, `Пожалуйста, уточните стоимость`, {
      reply_markup: {
        inline_keyboard: [
          [{text: `до 2000 ${rub}`, callback_data: `${item}_low`}],
          [{text: `от 2000 ${rub} до 3500 ${rub}`, callback_data: `${item}_midlow`}],
          [{text: `от 3500 ${rub} до 5000 ${rub}`, callback_data: `${item}_midhigh`}],
          [{text: `от 5000 ${rub}`, callback_data: `${item}_high`}]
        ]
      }
    })
  },
  choosePriceForAll (msg) {
    return bot.sendMessage(msg.from.id, `Пожалуйста, уточните желаемую стоимость букета или композиции`, {
      reply_markup: {
        inline_keyboard: [
          [{text: `до 2000 ${rub}`, callback_data: `all_low`}],
          [{text: `от 2000 ${rub} до 3500 ${rub}`, callback_data: `all_midlow`}],
          [{text: `от 3500 ${rub} до 5000 ${rub}`, callback_data: `all_midhigh`}],
          [{text: `от 5000 ${rub}`, callback_data: `all_high`}]
        ]
      }
    })
  }
}