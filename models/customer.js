const mongoose = require('mongoose');

const { Schema } = mongoose;

const CustomerSchema = new Schema({
  dogOwner: {
    type: String,
  },
  dogName: {
    type: String,
  },
  contactName: {
    type: String,
  },
  phone: {
    type: String,
  },
  breed: {type: {}, default: {label: '', value:''}},
  size: {type: {}, default: {label: '', value:''}},
  gender: {type: {}, default: {label: '', value:''}},
  address: {
    type: String,
  },
  birthday: {
    type: String,
  },
  visits: [{ type: mongoose.Types.ObjectId, required: true, ref: 'visit' }],
  user: { type: mongoose.Types.ObjectId, required: true, ref: 'user' },
  timestamp: {
    type: Number,
  },
});


const Customer = mongoose.model('customer', CustomerSchema);

module.exports = Customer;