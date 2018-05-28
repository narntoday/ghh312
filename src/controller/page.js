const queryController = require('./query')

module.exports = {
  changePage(user, query, action) {
    let pageNumber = user.pages[query],
      params = {}

    if (action === 'reset') {
      user.pages[query] = 1
      user.save()
        .then(() => queryController.findByQuery(user, query))
        .catch(err => console.log(err))
    } else {
      params[query] = action === 'add' ? (pageNumber + 1) : (pageNumber - 1)
      user.pages.set(params)
      user.save()
        .then(() => queryController.findByQuery(user, query))
        .catch(err => console.log(err))
    }
  },
  changePagePrice(user, query, action, cb_data) {
    let pageNumber = user.pagesPrice[query],
      params = {}

    if (action === 'reset') {
      user.pagesPrice[query] = 1
      user.save()
        .then(() => queryController.findByPrice(user, query, cb_data.slice(11)))
        .catch((err) => console.log(err))
    } else {
      params[query] = action === 'add' ? (pageNumber + 1) : (pageNumber - 1)
      user.pagesPrice.set(params)
      user.save()
        .then(() => queryController.findByPrice(user, query, cb_data.slice(10)))
        .catch((err) => console.log(err))
    }
  },
  changePageReason(user, query, action, cb_data) {
    let pageNumber = user.pagesReason[query],
        params = {}

    if (action === 'reset') {
      user.pagesReason[query] = 1
      user.save()
        .then(() => queryController.findByReason(user, cb_data.slice(12)))
        .catch((err) => console.log(err))
    } else {
      params[query] = action === 'add' ? (pageNumber + 1) : (pageNumber - 1)
      user.pagesReason.set(params)
      user.save()
        .then(() => queryController.findByReason(user, cb_data.slice(11)))
        .catch((err) => console.log(err))
    }
  }
}