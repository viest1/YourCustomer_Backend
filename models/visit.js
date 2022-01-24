const mongoose = require('mongoose');

const { Schema } = mongoose;

const VisitSchema = new Schema({
  shop: [{}],
  visit: String,
  hour: String,
  service: {},
  price: {},
  premium: [{}],
  tip: String,
  extraPay: {},
  time: String,
  behavior: {},
  size: String,
  comments: String,
  photo: String,
  photoBigSize: String,
  customer: { type: mongoose.Types.ObjectId, required: true, ref: 'customer' },
  user: { type: mongoose.Types.ObjectId, required: true, ref: 'user' },
  timestamp: {
    type: Number,
  },
  addedDate: {
    type: String,
  }
});

const Visit = mongoose.model('visit', VisitSchema);

module.exports = Visit;

