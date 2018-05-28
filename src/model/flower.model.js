const mongoose = require ('mongoose')
const Schema = mongoose.Schema

const FlowerSchema = new Schema({
  uid: {
    type: String,
    unique: true
  },
  category: String,
  title: String,
  image: String,
  price: Number,
  reason: String,
  link: String,
  description: String
})

module.exports = Flower = mongoose.model('flowers', FlowerSchema)