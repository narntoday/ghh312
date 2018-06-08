## Telegram bot which has all the functionality of flower shop e-commerce website

### [You can try it here](https://t.me/flowerss_shop_bot) or just copy its username **@flowerss_shop_bot**

### Functions:
* Bot uses data from website of real flower shop
* Data is stored in MongoDB database
* There are 3 categories of items (bouquets, composes and gifts)
* Within a category you can sort bouquets and composes by reason and price, and gifts only by price
* Also you can get a full list of items with pagination (5 items by page)
* You can see details of each item (number and type of flowers it contains, package material, etc.)
* Add to cart, remove from cart and show shopping cart functionality
* Three form steps required to confirm the order (name, phone number, address)
* Bot sends message about new order and its details to manager
* Logging user actions to database
* May be some functions I forgot to mention

Application is based on [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) and uses [Koa](https://koajs.com/) for backend and [mongoose](http://mongoosejs.com/) for operating with database.
