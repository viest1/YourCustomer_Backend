const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
//
const HttpError = require('../models/http-error');
const User = require('../models/user');
const Customer = require('../models/customer');
const Visit = require('../models/visit');
const mongoose = require('mongoose');
const { cloudinary } = require('../utils/cloudinary');

//
const addCustomer = async (req, res, next) => {
  const {
    image,
    dogOwner,
    behavior,
    dogName,
    contactName,
    phone,
    address,
    birthday,
    gender,
    size,
    breed,
    service,
    visit,
    hour,
    price,
    premium,
    tip,
    extraPay,
    time,
    comments,
    shop,
    timestamp,
    addedDate,
    userId
  } = req.body;
  let uploadResponse;
  let photo;
  if(image){
    try {
      uploadResponse = await cloudinary.uploader.upload(image, {
        upload_preset: 'ml_default'
      });
    } catch (e) {
      const error = new HttpError('something wrong with upload image', 500);
      return next(error);
    }
    if(uploadResponse){
      photo = uploadResponse.secure_url
    } else {
      photo = null;
    }
  }

  const newCustomer = new Customer({
    dogOwner,
    dogName,
    contactName,
    phone,
    address,
    birthday,
    gender,
    size,
    breed,
    timestamp,
    user: userId
  });

  const newVisit = new Visit({
    visit,
    hour,
    shop,
    service,
    price,
    premium,
    tip,
    extraPay,
    time,
    behavior,
    comments,
    photo,
    customer: newCustomer._id,
    timestamp,
    addedDate,
    user: userId
  });

  try {
    await newCustomer.visits.push(newVisit);
    await newVisit.save();
  } catch (e) {
    const error = new HttpError(e, 500);
    return next(error);
  }

  let existingUser;
  try{
    existingUser = await User.findById(userId)
    await existingUser.customers.push(newCustomer);
    await existingUser.visits.push(newVisit);
    await newCustomer.save();
    console.log('user',existingUser)
    await existingUser.save();
    console.log('yeeey worked')
  } catch (e){
    console.log(e)
    const error = new HttpError(e, 500)
    res.send(error)
    return next(error)
  }
  console.log(existingUser)

  res.send({ message: 'hello', newCustomer });
};

const getVisits = async (req, res, next) => {
  const userId = req.params.id
  let allVisits;
  try {
    allVisits = await Visit.find({user: userId}).populate('customer')
  } catch (e) {
    const error = new HttpError(e, 500);
    return next(error);
  }
  // res.send({visits: thisCustomer.visits.map((item)=>item.toObject({getters:true}))})
  res.send({ allVisits });
};

const getCustomers = async (req, res, next) => {
  const userId = req.params.id
  let allCustomers;
  try {
    allCustomers = await Customer.find({user: userId}).populate('visits')
  } catch (e) {
    const error = new HttpError(e, 500);
    return next(error);
  }
  // res.send({visits: thisCustomer.visits.map((item)=>item.toObject({getters:true}))})
  res.send({ allCustomers });
};

const customerDetails = async (req, res, next) => {
  const { id } = req.params
  let customer;
  try{
    customer = await Customer.findById(id).populate('visits')
  } catch (e) {
    const error = new HttpError('Something wrong with ID Customer', 500)
    return next(error)
  }
  res.send(customer)
}

const visitDetails = async (req, res, next) => {
  const { id } = req.params
  let visit;
  try{
    visit = await Visit.findById(id).populate('customer')
  } catch (e) {
    const error = new HttpError('Something wrong with ID Visit', 500)
    return next(error)
  }
  res.send(visit)
}

const editCustomer = async (req, res, next) => {
  const { id } = req.params
  const body = req.body
  console.log(id, body)
  let customer;
  try{
    customer = await Customer.findByIdAndUpdate(id, body)
  } catch (e) {
    const error = new HttpError('Something wrong with ID Customer', 500)
    return next(error)
  }
  res.send(customer)
}

const addVisit = async (req, res, next) => {
  const { id } = req.params
  const {visit, hour, shop, service, price, premium, tip, extraPay, time, behavior, comments, image, timestamp, addedDate, userId} = req.body

  let uploadResponse;
  let photo;
  if(image){
    try {
      uploadResponse = await cloudinary.uploader.upload(image, {
        upload_preset: 'ml_default'
      });
    } catch (e) {
      const error = new HttpError('something wrong with upload image', 500);
      return next(error);
    }
    if(uploadResponse){
      photo = uploadResponse.secure_url
    } else {
      photo = null;
    }
  }
  const newVisit = new Visit({
    visit,
    hour,
    shop,
    service,
    price,
    premium,
    tip,
    extraPay,
    time,
    behavior,
    comments,
    photo,
    customer: id,
    timestamp,
    addedDate,
    user: userId
  });
  console.log(newVisit)
  let customer;
  let existingUser;
  try{
    existingUser = await User.findById(userId)
    customer = await Customer.findById(id)
    await existingUser.visits.push(newVisit);
    await customer.visits.push(newVisit);
    await existingUser.save();
    await newVisit.save();
    await customer.save();
  } catch (e) {
    console.log(e)
    const error = new HttpError('Something wrong with ID Customer', 500)
    return next(error)
  }
  res.send({customer})
}

const editVisit = async (req, res, next) => {
  const { id } = req.params
  const body = req.body
  const {image} = req.body

  let uploadResponse;
  let photo;
  if(image){
    try {
      uploadResponse = await cloudinary.uploader.upload(image, {
        upload_preset: 'ml_default'
      });
    } catch (e) {
      const error = new HttpError('something wrong with upload image', 500);
      return next(error);
    }
    if(uploadResponse){
      photo = uploadResponse.secure_url
    } else {
      photo = null;
    }
  }
  body.photo = photo

  let visit;
  try{
    visit = await Visit.findByIdAndUpdate(id, body)
  } catch (e) {
    const error = new HttpError('Something wrong with ID Visit', 500)
    return next(error)
  }
  res.send(visit)
}

const getVisitsCustomer = async (req, res, next) => {
    const { id } = req.params
    let visits;
    try{
        visits = await Customer.findById(id).populate('visits')
    } catch (e) {
        const error = new HttpError('Something wrong with ID Customer', 500)
        return next(error)
    }
    res.send(visits)
}

const login = async (req, res, next) => {
 const email = req.body.emailLogin
    const password = req.body.passwordLogin
  let existingUser;

 try {
   existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      'Logging in failed, please try again later.',
     500
    );
   return next(error);
  }

  if (!existingUser) {
    const error = new HttpError(
      'Invalid credentials, could not log you in.',
      403
    );
    return next(error);
  }

 let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
 } catch (err) {
    const error = new HttpError(
      'Could not log you in, please check your credentials and try again.',
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError(
      'Invalid credentials, could not log you in.',
      403
    );
     return next(error);
  }

   let token;
   try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      `${process.env.JWT_TOKEN}`,
      { expiresIn: '1h' }
    );
   } catch (err) {
     const error = new HttpError(
       'Logging in failed, please try again later.',
      500
     );
    return next(error);
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
    name: existingUser.name
  });
 };

const signup = async (req, res, next) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }
   const { name, email, password } = req.body;

   let existingUser;
   try {
     existingUser = await User.findOne({ email: email });
   } catch (err) {
     const error = new HttpError(
       'Signing up failed, please try again later.',
       500
     );
     return next(error);
   }

   if (existingUser) {
     const error = new HttpError(
       'User exists already, please login instead.',
       422
     );
     return next(error);
   }

   let hashedPassword;
   try {
     hashedPassword = await bcrypt.hash(password, 12);
   } catch (err) {
     const error = new HttpError(
       'Could not create user, please try again.',
       500
     );
     return next(error);
   }

   const createdUser = new User({
     name,
     email,
     password: hashedPassword,
   });

   try {
     await createdUser.save();
   } catch (err) {
     const error = new HttpError(
       'Signing up failed, please try again later.',
       500
     );
     return next(error);
   }

   let token;
   try {
     token = jwt.sign(
       { userId: createdUser.id, email: createdUser.email },
       `${process.env.JWT_KEY}`,
       { expiresIn: '1h' }
     );
   } catch (err) {
     const error = new HttpError(
       'Signing up failed, please try again later.',
       500
     );
     return next(error);
   }

   res
     .status(201)
     .json({ userId: createdUser.id, email: createdUser.email, token: token });

 };

exports.login = login;
exports.signup = signup;
exports.addCustomer = addCustomer;
exports.getVisits = getVisits;
exports.getCustomers = getCustomers;
exports.customerDetails = customerDetails;
exports.visitDetails = visitDetails;
exports.editCustomer = editCustomer;
exports.editVisit = editVisit;
exports.getVisitsCustomer = getVisitsCustomer;
exports.addVisit = addVisit;
