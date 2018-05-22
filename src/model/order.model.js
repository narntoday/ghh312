const mongoose = require ('mongoose');
const Schema = mongoose.Schema;


const FormSchema = new Schema({
  chat: Number,
  name: String,
  address: String,
  phone: String
});

module.exports = Form = mongoose.model('orders', FormSchema);