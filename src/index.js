const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const https = require('https');
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

// Start server
const app = new Koa();
const router = Router();

router.post('/bot', ctx => {
  const { body } = ctx.request;
  bot.processUpdate(body);
  ctx.status = 200
});

// Ping to prevent app sleeping
setInterval(() => https.get(process.env.HEROKU_URL), 900000);

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

const User = require('./model/user.model');
const Flower = require('./model/flower.model');

// Bot start
module.exports = bot = new TelegramBot(process.env.TOKEN);
bot.setWebHook(`${process.env.HEROKU_URL}bot`);

// Bot logic
const mainController = require('./controller/main');
const queryController = require('./controller/query');
const pageController = require('./controller/page');
const orderController = require('./controller/order');
const cartController = require('./controller/cart');

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
      User.findOne({userId: id})
        .then(user => cartController.showCart(user))
        .catch(err => console.log(err));
      break;
    case '/contacts':
      return bot.sendMessage(id, helper.contacts);
    case '/bouquets':
      mainController.sendCallback(msg, 'bouquets');
      break;
    case '/compose':
      mainController.sendCallback(msg, 'compose');
      break;
    case '/gifts':
      mainController.sendCallback(msg, 'gifts');
      break;
    case '/reasons':
      mainController.showReasons(id);
      break;
    case '/prices':
      mainController.choosePriceForAll(msg);
      break
  }
});
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
        mainController.sendCallback(msg, 'bouquets');
        break;
      case kb.home.compose:
        mainController.sendCallback(msg, 'compose');
        break;
      case kb.home.gifts:
        mainController.sendCallback(msg, 'gifts');
        break;
      case kb.home.contacts:
        return bot.sendMessage(id, helper.contacts);
      case kb.home.cart:
        cartController.showCart(user);
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
        case 'b_reasons':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => mainController.showReasons(id))
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
          }).then(() => queryController.findByQuery(user, showItem))
            .catch(err => console.log(err));
          break;

        // go to next page
        case 'more bouquets':
        case 'more compose':
        case 'more gifts':
          pageController.changePage(user, msg.data.slice(5), 'add');
          break;

        // go to previous page
        case 'less bouquets':
        case 'less compose':
        case 'less gifts':
          pageController.changePage(user, msg.data.slice(5), 'remove');
          break;

        //reset page
        case 'start bouquets':
        case 'start compose':
        case 'start gifts':
          pageController.changePage(user, msg.data.slice(6), 'reset');
          break;

        // choose price
        case 'b_price':
        case 'c_price':
        case 'g_price':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => mainController.choosePrice(msg))
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
                .then(() => queryController.findByPrice(user, query, msg.data))
                .catch((err) => console.log(err))
            }).catch((err) => console.log(err));
          break;

        // go to next page of price
        case 'morePrice b_low':
        case 'morePrice b_midlow':
        case 'morePrice b_midhigh':
        case 'morePrice b_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => pageController.changePagePrice(user, 'bouquets', 'add', msg.data))
            .catch(err => console.log(err));
          break;

        case 'morePrice c_low':
        case 'morePrice c_midlow':
        case 'morePrice c_midhigh':
        case 'morePrice c_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => pageController.changePagePrice(user, 'compose', 'add', msg.data))
            .catch(err => console.log(err));
          break;

        case 'morePrice g_low':
        case 'morePrice g_midlow':
        case 'morePrice g_midhigh':
        case 'morePrice g_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => pageController.changePagePrice(user, 'gifts', 'add', msg.data))
            .catch(err => console.log(err));
          break;

        // go to prev page of price
        case 'lessPrice b_low':
        case 'lessPrice b_midlow':
        case 'lessPrice b_midhigh':
        case 'lessPrice b_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => pageController.changePagePrice(user, 'bouquets', 'remove', msg.data))
            .catch(err => console.log(err));
          break;

        case 'lessPrice с_low':
        case 'lessPrice с_midlow':
        case 'lessPrice с_midhigh':
        case 'lessPrice с_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => pageController.changePagePrice(user, 'compose', 'remove', msg.data))
            .catch(err => console.log(err));
          break;

        case 'lessPrice g_low':
        case 'lessPrice g_midlow':
        case 'lessPrice g_midhigh':
        case 'lessPrice g_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => pageController.changePagePrice(user, 'gifts', 'remove', msg.data))
            .catch(err => console.log(err));
          break;

        case 'startPrice b_low':
        case 'startPrice b_midlow':
        case 'startPrice b_midhigh':
        case 'startPrice b_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => pageController.changePagePrice(user, 'bouquets', 'reset', msg.data))
            .catch(err => console.log(err));
          break;

        case 'startPrice c_low':
        case 'startPrice c_midlow':
        case 'startPrice c_midhigh':
        case 'startPrice c_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => pageController.changePagePrice(user, 'compose', 'reset', msg.data))
            .catch(err => console.log(err));
          break;

        case 'startPrice g_low':
        case 'startPrice g_midlow':
        case 'startPrice g_midhigh':
        case 'startPrice g_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => pageController.changePagePrice(user, 'gifts', 'reset', msg.data))
            .catch(err => console.log(err));
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
            .then(() => cartController.showCart(user))
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
            .then(() => mainController.choosePrice(msg))
            .catch((err) => console.log(err));
          break;

        // process the order
        case 'order':
          orderController(msg.message.chat.id);
          break;
      }

    if (msg.data.startsWith('/f')) {
      queryController.findFlower(msg.data.slice(2), id)
    } else if (msg.data.startsWith('add')) {
      // add to cart
      const item = msg.data.slice(6);
      console.log(item)
      bot.answerCallbackQuery({
        callback_query_id: msg.id,
        text: `Добавлено в корзину`
      }).then(() => cartController.addToCart(item, user))
        .catch((err) => console.log(err));
    }
  }).catch(err => console.log(err));
});