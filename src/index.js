const TelegramBot = require('node-telegram-bot-api')
require('dotenv').config()
const https = require('https')
const Koa = require('koa')
const Router = require('koa-router')
const Bodyparser = require('koa-bodyparser')
const mongoose = require('mongoose')
const mongooseOptions = {
  keepAlive: 300000,
  connectTimeoutMS : 30000
}
const helper = require ('./helper')
const keyboard = require ('./keyboard')
const kb = require ('./keyboard-buttons')

// Start server
const app = new Koa()
const router = Router()

router.post('/bot', ctx => {
  const { body } = ctx.request
  bot.processUpdate(body)
  ctx.status = 200
})

// Ping to prevent app sleeping
setInterval(() => https.get(process.env.HEROKU_URL), 900000)

app.use(Bodyparser())
app.use(router.routes())
app.listen(`${process.env.PORT || 5000}`, () => {
  console.log(`Server is listening on ${process.env.PORT}`)
})

helper.logStart()

// Database
mongoose.connect(`${process.env.PROD_MONGODB}`, mongooseOptions)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log(err))

const User = require('./model/user.model')
const Flower = require('./model/flower.model')
const Form = require('./model/order.model')

// Bot start
module.exports = bot = new TelegramBot(process.env.TOKEN)
bot.setWebHook(`${process.env.HEROKU_URL}bot`)

// Bot logic
const MainController = require('./controller/main')
const QueryController = require('./controller/query')
const PageController = require('./controller/page')
const OrderController = require('./controller/order')
const CartController = require('./controller/cart')

bot.onText(/^\/[a-zA-Z]+$/, msg => {
  const id = helper.getChatId(msg)
  
  switch (msg.text) {
    // import data to database
    case '/import':
      const database = require ('./database.json')
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
          .catch(e => console.log(e)))
      break

    case '/start':
    case '/help':
      bot.sendMessage(id, helper.description).then(() => {
        return bot.sendMessage(id, `Выберите пункт меню`, {
          reply_markup: {
            keyboard: keyboard.home,
            resize_keyboard: true
          }
        })
      }).catch(err => console.log(err))
      break
    case '/cart':
      User.findOne({userId: id})
        .then(user => CartController.showCart(user))
        .catch(err => console.log(err))
      break
    case '/contacts':
      return bot.sendMessage(id, helper.contacts)
    case '/bouquets':
      MainController.sendCallback(msg, 'bouquets')
      break
    case '/compose':
      MainController.sendCallback(msg, 'compose')
      break
    case '/gifts':
      MainController.sendCallback(msg, 'gifts')
      break
    case '/reasons':
      MainController.showReasons(id)
      break
    case '/prices':
      MainController.choosePriceForAll(msg)
      break
  }
})
bot.on('message', msg => {

  const id = helper.getChatId(msg)
  const { username } = msg.from

  //Add user to database
  User.findOne({userId: id}).then(user => {
    if ( !user ) {
      new User({
        userId: id,
        pages: {},
        pagesPrice: {},
        pagesReason: {},
        cart: {}
      }).save()
        .then(() => bot.sendMessage(447069712, `New user @${username}`))
        .catch(err => console.log(err))
    }

    switch(msg.text) {
      case kb.home.bouqets:
        MainController.sendCallback(msg, 'bouquets')
        break
      case kb.home.compose:
        MainController.sendCallback(msg, 'compose')
        break
      case kb.home.gifts:
        MainController.sendCallback(msg, 'gifts')
        break
      case kb.home.cart:
        CartController.showCart(user)
        break
    }
  }).catch(err => console.log(err))
})
bot.on('callback_query', msg => {
  const id = msg.message.chat.id

  User.findOne({userId: id})
    .then(user => {
      switch (msg.data) {
        //show all items
        case 'b_all':
        case 'c_all':
        case 'g_all':
          let showItem, itemText
          switch (msg.data) {
            case 'b_all':
              showItem = 'bouquets'
              itemText = 'букеты'
              break
            case 'c_all':
              showItem = 'compose'
              itemText = 'композиции'
              break
            case 'g_all':
              showItem = 'gifts'
              itemText = 'подарки'
              break
          }

          bot.answerCallbackQuery({
            callback_query_id: msg.id,
            text: `Показаны все ${itemText}`
          }).then(() => QueryController.findByQuery(user, showItem))
          break

        // go to next page
        case 'more bouquets':
        case 'more compose':
        case 'more gifts':
          PageController.changePage(user, msg.data.slice(5), 'add')
          break

        // go to previous page
        case 'less bouquets':
        case 'less compose':
        case 'less gifts':
          PageController.changePage(user, msg.data.slice(5), 'remove')
          break

        //reset page
        case 'start bouquets':
        case 'start compose':
        case 'start gifts':
          PageController.changePage(user, msg.data.slice(6), 'reset')
          break

        // choose price
        case 'b_price':
        case 'c_price':
        case 'g_price':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => MainController.choosePrice(msg))
          break

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
          let queryPrice
          switch (msg.data.substr(0,1)) {
            case 'b':
              queryPrice = 'bouquets'
              break
            case 'c':
              queryPrice = 'compose'
              break
            case 'g':
              queryPrice = 'gifts'
              break
          }
          user.pagesPrice[queryPrice] = 1
          user.save()
            .then(() => {
              bot.answerCallbackQuery({callback_query_id: msg.id})
                .then(() => QueryController.findByPrice(user, queryPrice, msg.data))
            })
          break

        // go to next price page
        case 'morePrice b_low':
        case 'morePrice b_midlow':
        case 'morePrice b_midhigh':
        case 'morePrice b_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => PageController.changePagePrice(user, 'bouquets', 'add', msg.data))
          break

        case 'morePrice c_low':
        case 'morePrice c_midlow':
        case 'morePrice c_midhigh':
        case 'morePrice c_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => PageController.changePagePrice(user, 'compose', 'add', msg.data))
          break

        case 'morePrice g_low':
        case 'morePrice g_midlow':
        case 'morePrice g_midhigh':
        case 'morePrice g_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => PageController.changePagePrice(user, 'gifts', 'add', msg.data))
          break

        // go to prev price page
        case 'lessPrice b_low':
        case 'lessPrice b_midlow':
        case 'lessPrice b_midhigh':
        case 'lessPrice b_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => PageController.changePagePrice(user, 'bouquets', 'remove', msg.data))
          break

        case 'lessPrice с_low':
        case 'lessPrice с_midlow':
        case 'lessPrice с_midhigh':
        case 'lessPrice с_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => PageController.changePagePrice(user, 'compose', 'remove', msg.data))
          break

        case 'lessPrice g_low':
        case 'lessPrice g_midlow':
        case 'lessPrice g_midhigh':
        case 'lessPrice g_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => PageController.changePagePrice(user, 'gifts', 'remove', msg.data))
          break

        // reset price page
        case 'startPrice b_low':
        case 'startPrice b_midlow':
        case 'startPrice b_midhigh':
        case 'startPrice b_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => PageController.changePagePrice(user, 'bouquets', 'reset', msg.data))
          break

        case 'startPrice c_low':
        case 'startPrice c_midlow':
        case 'startPrice c_midhigh':
        case 'startPrice c_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => PageController.changePagePrice(user, 'compose', 'reset', msg.data))
          break

        case 'startPrice g_low':
        case 'startPrice g_midlow':
        case 'startPrice g_midhigh':
        case 'startPrice g_high':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => PageController.changePagePrice(user, 'gifts', 'reset', msg.data))
          break

        // show reasons
        case 'b_reasons':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => MainController.showReasons(id, 'bouquet'))
          break
        case 'c_reasons':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => MainController.showReasons(id, 'compose'))
          break

        // show items by reasons
        case 'b_birthday':
        case 'c_birthday':
        case 'b_jubilee':
        case 'c_jubilee':
        case 'b_wedding':
        case 'c_wedding':
        case 'b_love':
        case 'c_love':
          let queryReason = msg.data.substr(0,1) === 'b' ? 'bouquets' : 'compose'
          user.pagesReason[queryReason] = 1
          user.save()
            .then(() => bot.answerCallbackQuery({callback_query_id: msg.id}))
            .then(() => QueryController.findByReason(user, msg.data))
          break

        // go to next reason page
        case 'moreReason b_birthday':
        case 'moreReason b_jubilee':
        case 'moreReason b_wedding':
        case 'moreReason b_love':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => PageController.changePageReason(user, 'bouquets', 'add', msg.data))
          break

        case 'moreReason c_birthday':
        case 'moreReason c_jubilee':
        case 'moreReason c_wedding':
        case 'moreReason c_love':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => PageController.changePageReason(user, 'compose', 'add', msg.data))
          break

          // go to previous reason page
        case 'lessReason b_birthday':
        case 'lessReason b_jubilee':
        case 'lessReason b_wedding':
        case 'lessReason b_love':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => PageController.changePageReason(user, 'bouquets', 'remove', msg.data))
          break

        case 'lessReason c_birthday':
        case 'lessReason c_jubilee':
        case 'lessReason c_wedding':
        case 'lessReason c_love':
          bot.answerCallbackQuery({callback_query_id: msg.id})
            .then(() => PageController.changePageReason(user, 'compose', 'remove', msg.data))
          break

        // reset reason page
        case 'startReason b_birthday':
        case 'startReason b_jubilee':
        case 'startReason b_wedding':
        case 'startReason b_love':
          bot.answerCallbackQuery({callback_query_id: msg.id})
              .then(() => PageController.changePageReason(user, 'bouquets', 'reset', msg.data))
          break

        case 'startReason c_birthday':
        case 'startReason c_jubilee':
        case 'startReason c_wedding':
        case 'startReason c_love':
          bot.answerCallbackQuery({callback_query_id: msg.id})
              .then(() => PageController.changePageReason(user, 'compose', 'reset', msg.data))
          break

        // show cart
        case 'cart':
          bot.answerCallbackQuery({callback_query_id: msg.id})
              .then(() => CartController.showCart(user))
          break

        // clear cart:
        case 'clear':
          bot.answerCallbackQuery({
            callback_query_id: msg.id,
            text: 'Корзина очищена!'
          }).then(() => CartController.clearCart(user))
          break

        // process the order
        case 'order':
          OrderController.processOrder(msg.message.chat.id)
          break

        // use new data for order
        case 'use_new_data':
          bot.answerCallbackQuery({
            callback_query_id: msg.id,
            text: 'Введите новые данные'
          }).then(() => Form.findOneAndRemove({id: user.userId}))
                .then(form => form.save())
                  .then(() => OrderController.processOrder(msg.message.chat.id))
          break

        // use existing data for order
        case 'use_exist_data':
          bot.answerCallbackQuery({
            callback_query_id: msg.id,
            text: 'Использованы ранее введёные данные'
          }).then(() => OrderController.sendConfirmation(msg.message.chat.id))
          break
      }

    // send item details
    if (msg.data.startsWith('/f')) {
      QueryController.findFlower(msg.data.slice(2), id)
    }

    // add item to cart
    else if (msg.data.startsWith('add')) {
      const item = msg.data.slice(6)
      bot.answerCallbackQuery({
        callback_query_id: msg.id,
        text: `Добавлено в корзину`
      }).then(() => CartController.addToCart(item, user))
    }

    // remove item from cart
    else if (msg.data.startsWith('delete')) {
      const item = msg.data.slice(9)
      bot.answerCallbackQuery({
        callback_query_id: msg.id,
        text: 'Удалено из корзины'
      }).then(() => CartController.removeFromCart(item, user))
        .catch((err) => console.log(err))
    }
  }).catch(err => console.log(err))
})