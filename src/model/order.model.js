const mongoose = require ('mongoose')

const FormSchema = new mongoose.Schema({
  id: Number,
  name: String,
  address: String,
  phone: String
})

module.exports = Form = mongoose.model('orders', FormSchema)