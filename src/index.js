const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const Koa = require('koa');
const Router = require('koa-router');
const Bodyparser = require('koa-bodyparser');
const mongoose = require('mongoose');
const mongooseOptions = {
  keepAlive: 300000,
  connectTimeoutMS : 30000
};
const helper = require ('./helper');
const keyboard = require ('./keyboard');
const kb = require ('./keyboard-buttons');
const globals = require('./globals');

// Start server
const app = new Koa();
const router = Router()

router.post('/bot', ctx => {
  const { body } = ctx.request;
  bot.processUpdate(body);
  ctx.status = 200
});

setInterval(function() {
  app.get("http://enigmatic-sands-71189.herokuapp.com");
}, 600000);

app.use(Bodyparser());
app.use(router.routes());
app.listen(`${process.env.PORT || 5000}`, () => {
  console.log(`Server is listening on ${process.env.PORT}`)
});

helper.logStart();

// Database
mongoose.connect(`${process.env.PROD_MONGODB}`, mongooseOptions)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log(err));

require('./model/order.model');
const Form = mongoose.model('orders');

require('./model/user.model');
const User = mongoose.model('users');

require('./model/flower.model');
const Flower = mongoose.model('flowers');

// Bot start
const bot = new TelegramBot(process.env.TOKEN);
bot.setWebHook(`${process.env.HEROKU_URL}bot`);

const rub = globals.rub;
const limit = globals.limit;

// Bot logic
bot.onText(/^\/[a-zA-Z]+$/, msg => {
  const id = helper.getChatId(msg);
  
  switch (msg.text) {
    // import data to database
    case '/import':
      const database = require ('./database.json');
      database['flowers'].forEach(f => new Flower({
        uid: f.uid,
        category: f.category,
        title: f.title,
        image: f.image,
        price: parseInt((f.price).replace(' ', ''), 10),
        reason: f.reason,
        link: f.link,
        description: f.description
      }).save()
        .then(() => console.log('Товары загружены'))
        .catch(e => console.log(e)));
      break;

    case '/start':
    case '/help':
      bot.sendMessage(id, helper.description).then(() => {
        return bot.sendMessage(id, `Выберите пункт меню`, {
          reply_markup: {
            keyboard: keyboard.home,
            resize_keyboard: true
          }
        })
      }).catch(err => console.log(err));
      break;
    case '/cart':
      User.findOne({userId: id}).then(user => {
        showCart(user)
      }).catch(err => console.log(err));
      break;
    case '/contacts':
      return bot.sendMessage(id, helper.contacts);
    case '/bouquets':
      sendCallback(msg, 'bouquets');
      break;
    case '/compose':
      sendCallback(msg, 'compose');
      break;
    case '/gifts':
      sendCallback(msg, 'gifts');
      break;
    case '/reasons':
      showReasons(id);
      break;
    case '/prices':
      choosePrice(id);
      break
  }
});

// bot.onText(/\/f (.+) in (.+)/, (msg, match) => {
//   const chatId = helper.getChatId(msg);
//   const text = match[1];
//   const time = match[2];
//
//   return bot.sendMessage(chatId, `1: ${text}, 2: ${time}`)
// });

bot.on('message', msg => {

  const id = helper.getChatId(msg);
  const { username } = msg.from;

  //Add user to database
  User.findOne({userId: id}).then(user => {
    if ( !user ) {
      new User({
        userId: id,
        pages: {},
        pagesPrice: {},
        cart: {}
      }).save()
        .then(() => bot.sendMessage(447069712, `New user @${username}`))
        .catch(err => console.log(err));
    }

    switch(msg.text) {
      case kb.home.bouqets:
        sendCallback(msg, 'bouquets');
        break;
      case kb.home.compose:
        sendCallback(msg, 'compose');
        break;
      case kb.home.gifts:
        sendCallback(msg, 'gifts');
        break;
      case kb.home.contacts:
        return bot.sendMessage(id, helper.contacts);
      case kb.home.cart:
        showCart(user);
        break
    }
  }).catch(err => console.log(err));
});

bot.on('callback_query', msg => {
  const id = msg.message.chat.id;

  User.findOne({userId: id})
    .then(user => {
      switch (msg.data) {
        // bouquets
        case 'b_flowers':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => bot.sendMessage(id, `Выберите, какие цветы Вы хотите видеть в букете`, {
              reply_markup: {
                inline_keyboard: [
                  [{text: 'Розы', callback_data: 'b_roses'}],
                  [{text: 'Тюльпаны', callback_data: 'b_tulips'}],
                  [{text: 'Хризантемы', callback_data: 'b_chris'}],
                  [{text: 'Герберы', callback_data: 'b_herb'}]
                ]
              }
            })).catch(err => console.log(err));
          break;
        case 'b_reasons':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => showReasons(id))
            .catch(err => console.log(err));
          break;

        //show all items
        case 'b_all':
        case 'c_all':
        case 'g_all':
          let showItem, itemText;
          switch (msg.data) {
            case 'b_all':
              showItem = 'bouquets';
              itemText = 'букеты';
              break;
            case 'c_all':
              showItem = 'compose';
              itemText = 'композиции';
              break;
            case 'g_all':
              showItem = 'gifts';
              itemText = 'подарки';
              break;
          }

          bot.answerCallbackQuery({
            callback_query_id: msg.id,
            text: `Показаны все ${itemText}`
          }).then(() => findByQuery(user, showItem))
            .catch(err => console.log(err));
          break;

        // go to next page
        case 'more bouquets':
        case 'more compose':
        case 'more gifts':
          changePage(user, msg.data.slice(5), 'add');
          break;

        // go to previous page
        case 'less bouquets':
        case 'less compose':
        case 'less gifts':
          changePage(user, msg.data.slice(5), 'remove');
          break;

        //reset page
        case 'start bouquets':
        case 'start compose':
        case 'start gifts':
          changePage(user, msg.data.slice(6), 'reset');
          break;

        // choose price
        case 'b_price':
        case 'c_price':
        case 'g_price':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => choosePrice(msg))
            .catch(err => console.log(err));
          break;

        // show items by price
        case 'b_low':
        case 'b_midlow':
        case 'b_midhigh':
        case 'b_high':
        case 'c_low':
        case 'c_midlow':
        case 'c_midhigh':
        case 'c_high':
        case 'g_low':
        case 'g_midlow':
        case 'g_midhigh':
        case 'g_high':
          let query;
          switch (msg.data.substr(0,1)) {
            case 'b':
              query = 'bouquets';
              break;
            case 'c':
              query = 'compose';
              break;
            case 'g':
              query = 'gifts';
              break
          }

          user.pagesPrice[query] = 1;
          user.save()
            .then(() => {
              bot.answerCallbackQuery({callback_query_id: msg.id})
                .then(() => findByPrice(user, query, msg.data))
                .catch((err) => console.log(err))
            }).catch((err) => console.log(err));
          break;

        // go to next page of price
        case 'morePrice b_low':
        case 'morePrice b_midlow':
        case 'morePrice b_midhigh':
        case 'morePrice b_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => changePagePrice(user, 'bouquets', 'add', msg.data))
            .catch(err => console.log(err));
          break;

        case 'morePrice c_low':
        case 'morePrice c_midlow':        case 'morePrice c_midhigh':
        case 'morePrice c_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => changePagePrice(user, 'compose', 'add', msg.data))
            .catch(err => console.log(err));
          break;

        case 'morePrice g_low':
        case 'morePrice g_midlow':
        case 'morePrice g_midhigh':
        case 'morePrice g_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => changePagePrice(user, 'gifts', 'add', msg.data))
            .catch(err => console.log(err));
          break;

        // go to prev page of price
        case 'lessPrice b_low':
        case 'lessPrice b_midlow':
        case 'lessPrice b_midhigh':
        case 'lessPrice b_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => changePagePrice(user, 'bouquets', 'remove', msg.data))
            .catch(err => console.log(err));
          break;

        case 'lessPrice с_low':
        case 'lessPrice с_midlow':
        case 'lessPrice с_midhigh':
        case 'lessPrice с_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => changePagePrice(user, 'compose', 'remove', msg.data))
            .catch(err => console.log(err));
          break;

        case 'lessPrice g_low':
        case 'lessPrice g_midlow':
        case 'lessPrice g_midhigh':
        case 'lessPrice g_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => changePagePrice(user, 'gifts', 'remove', msg.data))
            .catch(err => console.log(err));
          break;

        case 'startPrice b_low':
        case 'startPrice b_midlow':
        case 'startPrice b_midhigh':
        case 'startPrice b_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => changePagePrice(user, 'bouquets', 'reset', msg.data))
            .catch(err => console.log(err));
          break;

        case 'startPrice c_low':
        case 'startPrice c_midlow':
        case 'startPrice c_midhigh':
        case 'startPrice c_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => changePagePrice(user, 'compose', 'reset', msg.data))
            .catch(err => console.log(err));
          break;

        case 'startPrice g_low':
        case 'startPrice g_midlow':
        case 'startPrice g_midhigh':
        case 'startPrice g_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => changePagePrice(user, 'gifts', 'reset', msg.data))
            .catch(err => console.log(err));
          break;

        // add to cart
        case 'add':
          const item = msg.message.caption;
          bot.answerCallbackQuery({
            callback_query_id: msg.id,
            text: `Добавлено в корзину`
          }).then(() => helper.addToCart(item, id))
            .catch((err) => console.log(err));
          break;

        // remove from cart
        case 'delete':
          bot.answerCallbackQuery({
            callback_query_id: msg.id,
            text: 'Удалено из корзины'
          }).then(() => helper.removeFromCart(msg.message.caption, msg.message.chat.id))
            .catch((err) => console.log(err));
          break;

        // show cart
        case 'cart':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => showCart(user))
            .catch((err) => console.log(err));
          break;

        // clear cart:
        case 'clear':
          bot.answerCallbackQuery({
            callback_query_id: msg.id,
            text: 'Корзина очищена!'
          }).then(() => {
            user.cart = {};
            user.save()
          }).catch((err) => console.log(err));
          break;

        case 'birthday':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => choosePrice(msg))
            .catch((err) => console.log(err));
          break;

        // process the order
        case 'order':
          order(msg.message.chat.id);
          break;
      }

    if (msg.data.startsWith('/f')) {
        console.log(msg.data.slice(3))
        findFlower(msg.data.slice(2), id)
    }
  }).catch(err => console.log(err));
});

function findFlower(query, userId) {
  Flower.findOne({uid: query}).then(f => {
    const caption = `<b>${f.title}</b> - /f${f.uid}\n<b>Цена ${f.price} ${rub}</b>\n${f.description}`;
    return bot.sendPhoto(userId, f.image, {
      caption: caption,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {text: `-`, callback_data: 'delete'},
            {text: 'кол-во', callback_data: 'cart'},
            {text: `+`, callback_data: `add`}
          ]
        ]
      }
    })
  }).catch(err => console.log(err));
}

function showCart(user) {
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
}

function choosePrice(msg) {
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

function showReasons(id) {
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
}

function order(id) {

  Form.findOne({chat: id})
    .then(us => {

      //Add user ID to database if he doesn't exists
      if (!us) {
        let user = new Form({
          chat: id
        }).save()
      }
    });

  //First question
  bot.sendMessage(id, `Как Ваше имя?`, {
      reply_markup: {
        force_reply: true
      }
    })
    .then(msg => {
      const replyId = bot.onReplyToMessage(id, msg.message_id, msg => {

        //Add user's name to database
        Form.findOne({chat: id}).then((f) => {

          if (!f.name) {
            f.set("name", msg.text).save()
          }

        });

        bot.removeReplyListener(replyId);

        ///////// Second question

        bot.sendMessage(id, `Укажите адрес доставки`, {
            reply_markup: {
              force_reply: true
            }
          })
          .then(msg => {
            const replyId = bot.onReplyToMessage(id, msg.message_id, msg => {

              Form.findOne({chat: id}).then((f) => {

                //Check if name exists
                if (f.name) {
                  //Add user's address to database

                  if (!f.address) {
                    f.set("address", msg.text).save();
                  }

                  bot.removeReplyListener(replyId);

                  ////////////////// Third question

                  bot.sendMessage(id, `Ваш номер телефона)`, {reply_markup: {force_reply: true}})
                    .then(msg => {

                      const replyId = bot.onReplyToMessage(id, msg.message_id, msg => {

                        //Check if name and address exists
                        if (f.name && f.address) {
                          //Add user's phone to database

                          if (!f.phone) {
                            f.set("phone", msg.text).save();
                          }

                          bot.removeReplyListener(replyId);

                          //Send confirmation
                          bot.sendMessage(id, `Ваш заказ принят!\nВ ближайшее время с Вами свяжется наш менеджер.`, {
                            reply_markup: {
                              keyboard: keyboard.home,
                              resize_keyboard: true
                            }
                          });

                          //Send info to bot's owner
                          bot.sendMessage(447069712, helper.html(f), {parse_mode: 'HTML'});

                          //if at least one field is empty, suggest to repeat
                        } else if (f.name && !f.address || !f.name && f.address || !f.name && !f.address) {
                          bot.sendMessage(id, `Заполнить данные по новой?`, {
                            reply_markup: {
                              keyboard: [
                                ['Да', 'Пошел нахуй']
                              ],
                              resize_keyboard: true
                            }
                          });
                        }
                      })
                    })

                  //check if name exists
                } else {
                  bot.sendMessage(id, `Имя, сука!!!`, {
                    reply_markup: {
                      keyboard: [
                        ['Да', 'Пошел нахуй']
                      ],
                      resize_keyboard: true
                    }
                  });
                  return false
                }
              })
            })
          })
      })
    })
}

function sendCallback(msg, item) {
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

function findByQuery(user, query) {
  let page = user.pages[query];

  Flower.count({category: query}).then(number => {
    const pageTotal = Math.ceil(number/limit);

    if ((limit * (page - 1)) < number) {
      Flower.find({category: query}).limit(limit).skip(limit * (page - 1)).then(result => {

        const promises = result.map(flower => {
          return bot.sendPhoto(user.userId, flower.image, {
            caption: `<b>${flower.title}</b> - /f${flower.uid}\n<b>Цена ${flower.price} ${rub}</b>`,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {text: `➖`, callback_data: 'delete'},
                  {text: '🛍️', callback_data: 'cart'},
                  {text: `➕`, callback_data: `add`}
                ],
                [
                  {text: 'Подробнее', callback_data: `/f${flower.uid}`}
                ]
              ]
            }
          })
        });

        Promise.all(promises)
          .then(() => {
            let inlineKeyboard = [];
            if (page > 1 && page !== pageTotal) {
              inlineKeyboard = [
                [{text: '️️⬅️ Предыдущая', callback_data: `less ${query}`}],
                [{text: 'Следующая ➡', callback_data: `more ${query}`}]
              ]
            } else if (page === 1) {
              inlineKeyboard = [
                [{text: 'Следующая ➡️️', callback_data: `more ${query}`}]
              ]
            } else if (page === pageTotal) {
              inlineKeyboard = [
                [{text: '️️⬅️ Предыдущая', callback_data: `less ${query}`}],
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
}

function changePage(user, query, action) {
  let pageNumber = user.pages[query],
      params = {};

  if (action === 'reset') {
    user.pages[query] = 1;
    user.save()
      .then(() => findByQuery(user, query))
      .catch(err => console.log(err))
  } else {
    params[query] = action === 'add' ? (pageNumber + 1) : (pageNumber - 1);
    user.pages.set(params);
    user.save()
      .then(() => findByQuery(user, query))
      .catch(err => console.log(err))
  }
}

async function findByPrice (user, query, cb_data) {
  let count, result,
      page = user.pagesPrice[query];

  switch (cb_data) {
    case 'b_low':
    case 'c_low':
    case 'g_low':
      count = await Flower.count({category: query}).where('price').lte(2000);
      break;
    case 'b_midlow':
    case 'c_midlow':
    case 'g_midlow':
      count = await Flower.count({category: query}).where('price').gt(2000).lte(3500);
      break;
    case 'b_midhigh':
    case 'c_midhigh':
    case 'g_midhigh':
      count = await Flower.count({category: query}).where('price').gte(3500).lte(5000);
      break;
    case 'b_high':
    case 'c_high':
    case 'g_high':
      count = await Flower.count({category: query}).where('price').gt(2000);
      break;
  }

  if (count === 0) {
    return bot.sendMessage(user.userId, `По Вашему запросу ничего не найдено. Выберите другие критерии`)
  }

  if ((limit * (page - 1)) <= count) {
    switch (cb_data) {
      case 'b_low':
      case 'c_low':
      case 'g_low':
        result = await Flower.find({category: query}).where('price').lte(2000).limit(limit).skip(limit*(page-1));
        break;
      case 'b_midlow':
      case 'c_midlow':
      case 'g_midlow':
        result = await Flower.find({category: query}).where('price').gt(2000).lte(3500).limit(limit).skip(limit*(page-1));
        break;
      case 'b_midhigh':
      case 'c_midhigh':
      case 'g_midhigh':
        result = await Flower.find({category: query}).where('price').gte(3500).lte(5000).limit(limit).skip(limit*(page-1));
        break;
      case 'b_high':
      case 'c_high':
      case 'g_high':
        result = await Flower.find({category: query}).where('price').gt(2000).limit(limit).skip(limit*(page-1));
        break;
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

  const pageTotal = Math.ceil(count/limit);
  const promises = result.map(flower => {
    return bot.sendPhoto(user.userId, flower.image, {
      caption: `<b>${flower.title}</b> - /f${flower.uid}\n<b>Цена ${flower.price} ${rub}</b>`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {text: `➖`, callback_data: 'delete'},
            {text: '🛍️', callback_data: 'cart'},
            {text: `➕`, callback_data: `add`}
          ]
        ]
      }
    })
  });

  Promise.all(promises)
    .then(() => {
      let inlineKeyboard = [];
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
}

function changePagePrice(user, query, action, cb_data) {
  let pageNumber = user.pagesPrice[query],
      params = {};

  if (action === 'reset') {
    user.pagesPrice[query] = 1;
    user.save()

      .then(() => findByPrice(user, query, cb_data.slice(11)))
      .catch((err) => console.log(err))
  } else {
    params[query] = action === 'add' ? (pageNumber + 1) : (pageNumber - 1);
    user.pagesPrice.set(params);
    user.save()
      .then(() => findByPrice(user, query, cb_data.slice(10)))
      .catch((err) => console.log(err))
  }
}