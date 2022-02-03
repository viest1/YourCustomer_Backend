const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, default: 'Basic'},
  verifiedEmail: {type: Boolean, default: false},
  lastRequestResetPassword: Number,
  customers: [{type: mongoose.Types.ObjectId, required: true, ref: 'customer'}],
  visits: [{type: mongoose.Types.ObjectId, required: true, ref: 'visit'}],
 });

module.exports = mongoose.model('user', userSchema);