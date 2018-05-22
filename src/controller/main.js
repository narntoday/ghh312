const bot = require('../index');
const helper = require('../helper');
const kb = require ('../keyboard-buttons');
const globals = require('../globals');
const rub = globals.rub;

module.exports = {
  sendCallback(msg, item) {
    const id = helper.getChatId(msg);
    let text, keyboard;

    switch (item) {
      case 'bouquets':
        text = `Хотите заказать букет?\nВы можете выбрать, из каких цветов будет составлен букет, или повод, по которому Вы хотите его подарить.\nТакже Вы можете отсортировать букеты по стоимости или посмотреть весь ассортимент`;
        keyboard = {
          inline_keyboard: [
            [{text: `🌹 Выбрать цветы`, callback_data: 'b_flowers'}],
            [{text: `🎉 Выбрать повод`, callback_data: 'b_reasons'}],
            [{text: `💰 Выбрать по цене`, callback_data: 'b_price'}],
            [{text: `👀 Смотреть все`, callback_data: 'b_all'}]
          ]
        };
        break;
      case 'compose':
      case 'gifts':
        text = `Хотите заказать ${item === 'compose' ? 'композицию' : 'подарок'}?\nВы можете уточнить желаемую стоимость, или посмотреть все ${item === 'compose' ? 'композиции' : 'подарки'}`;
        keyboard = {
          inline_keyboard: [
            [{text: `💰 Выбрать по цене`, callback_data: item === 'compose' ? 'c_price' : 'g_price'}],
            [{text: `👀 Смотреть все`, callback_data: item === 'compose' ? 'c_all' : 'g_all'}]
          ]
        };
        break;
    }

    return bot.sendMessage(id, text, {
      reply_markup: keyboard
    });
  },
  showReasons(id) {
  return bot.sendMessage(id, `Выберите повод, на который хотите подарить букет:`, {
    reply_markup: {
      inline_keyboard: [
        [{text: kb.reasons.birthday, callback_data: 'birthday'}],
        [{text: kb.reasons.jubilee, callback_data: 'jubilee'}],
        [{text: kb.reasons.wedding, callback_data: 'wedding'}],
        [{text: kb.reasons.love, callback_data: 'love'}]
      ]
    }
  });
},
  choosePrice(msg) {
    console.log(msg)
    let item = msg.data.substr(0,1);
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
  }
};