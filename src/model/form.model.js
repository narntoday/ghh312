const mongoose = require ('mongoose');
const Schema = mongoose.Schema;


const FormSchema = new Schema({
  chat: Number,
  name: String,
  address: String,
  phone: String
});

mongoose.model('form', FormSchema);