const mongoose = require ('mongoose');
const Schema = mongoose.Schema;

const FlowerSchema = new Schema({
  uid: String,
  category: String,
  title: String,
  image: String,
  price: Number,
  reason: String,
  link: String,
  description: String
});

mongoose.model('flowers', FlowerSchema);