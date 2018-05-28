const mongoose = require ('mongoose')
const Schema = mongoose.Schema

const pagesSchema = new Schema({
  bouquets: {
    type: Number,
    default: 1
  },
  compose: {
    type: Number,
    default: 1
  },
  gifts: {
    type: Number,
    default: 1
  }
})

const cartSchema = new Schema({
  uid: String,
  title: String,
  image: String,
  price: Number,
  quantity: {
    type: Number,
    default: 1
  }
})

const UserSchema = new Schema({
  userId: {
    type: Number,
    required: true
  },
  pages: pagesSchema,
  pagesPrice: pagesSchema,
  pagesReason: pagesSchema,
  cart: [cartSchema]
})

module.exports = User = mongoose.model('users', UserSchema)