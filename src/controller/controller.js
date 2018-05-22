const bot = require('../index');
const helper = require('../helper');

bot.on('message', msg => {
  console.log('Module exported')
});

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
  }
};