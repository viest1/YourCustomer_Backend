const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
//
const HttpError = require('../models/http-error');
const User = require('../models/user');
const Customer = require('../models/customer');
const Visit = require('../models/visit');
const mongoose = require('mongoose');
const { cloudinary } = require('../utils/cloudinary');
const sgMail = require('@sendgrid/mail')
//
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

//
const paypal = require("@paypal/checkout-server-sdk")
const Environment =
  process.env.NODE_ENV === "production"
    ? paypal.core.LiveEnvironment
    : paypal.core.SandboxEnvironment
const paypalClient = process.env.NODE_ENV === "production" ?
  new paypal.core.PayPalHttpClient(
  new Environment(
    process.env.PAYPAL_CLIENT_ID_LIVE,
    process.env.PAYPAL_CLIENT_SECRET_LIVE
  )) : new paypal.core.PayPalHttpClient(
  new Environment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  )
)

const storeItems = new Map([
  [1, { price: 0.01, name: "Basic Type Account" }],
  [2, { price: 0.02, name: "Premium Type Account" }],
])

const proceedBuy = async (req, res) => {
  const request = new paypal.orders.OrdersCreateRequest()
  const total = req.body.items.reduce((sum, item) => {
    return sum + storeItems.get(item.id).price * item.quantity
  }, 0)
  console.log('proceed Buy ', req.body)
  request.prefer("return=representation")
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "EUR",
          value: total,
          breakdown: {
            item_total: {
              currency_code: "EUR",
              value: total,
            },
          },
        },
        items: req.body.items.map(item => {
          const storeItem = storeItems.get(item.id)
          return {
            name: storeItem.name,
            unit_amount: {
              currency_code: "EUR",
              value: storeItem.price,
            },
            quantity: item.quantity,
          }
        }),
      },
    ],
  })

  try {
    const order = await paypalClient.execute(request)
    res.json({ id: order.result.id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

const sendEmailToResetPassword = async(req,res,next) => {
  const {emailToResetPassword, timestamp} = req.body

  let existingUser;
  try{
    existingUser = await User.findOne({email: emailToResetPassword})
  } catch (e){
    const error = new HttpError('something wrong 1', 500)
    return next(error)
  }

  if (!existingUser) {
    const error = new HttpError(
      'something wrong 2',
      500
    );
    return next(error);
  }


  if (!existingUser.verifiedEmail) {
    const error = new HttpError(
      'something wrong 3',
      500
    );
    return next(error);
  }

  if(timestamp - existingUser.lastRequestResetPassword < 1000 * 30){
    const error = new HttpError(
      'something wrong 4',
      500
    );
    return next(error);
  }

  try{
    await User.findOneAndUpdate({email: emailToResetPassword},{lastRequestResetPassword: timestamp})
  } catch (e){
    const error = new HttpError('something wrong 1', 500)
    return next(error)
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email, role: existingUser.role },
      `${process.env.JWT_KEY}`,
      { expiresIn: '1h' }
    );
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later 1.',
      500
    );
    return next(error);
  }

  // Sending E-Mail
  const message = `
  Link to Reset Password - Your Customer - https://your-customer.netlify.app/resetPassword/${token}
  `

  const data = {
    to: existingUser.email,
    from: 'info@plwebsites.de',
    subject: `Link to Reset Password - Your Customer`,
    text: message,
    html: message.replace(/\r\n/g, '<br>'),
  }

  sgMail
    .send(data)
    .catch((e) => {
      console.error(e)
    })
  console.log(data)
  console.log('sent')

  res.status(200).json({message: 'You sent e-mail with link to reset password!'})
}

const setNewPassword = async(req,res,next)=>{
  const {passwordReset, tokenResetPassword} = req.body
  console.log(passwordReset, tokenResetPassword)

  let decodedToken;
  try{
    decodedToken = await jwt.verify(tokenResetPassword, process.env.JWT_KEY);
  } catch (e){
    const error = new HttpError('user not verified', 403)
    return next(error)
  }

  let existingUser;
  try {
    existingUser = await User.findById(decodedToken.userId);
  } catch (err) {
    const error = new HttpError(
      'Something wrong, please try again later.',
      500
    );
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError(
      'User does not exist, try again.',
      403
    );
    return next(error);
  }
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(passwordReset, 12);
  } catch (err) {
    const error = new HttpError(
      'Could not create new password, please try again.',
      500
    );
    return next(error);
  }

  let userChangedPassword;
  try {
    userChangedPassword = await User.findByIdAndUpdate(decodedToken.userId, {password: hashedPassword});
  } catch (err) {
    const error = new HttpError(
      'Something wrong, please try again later.',
      500
    );
    return next(error);
  }

  console.log(userChangedPassword)
  console.log('changed')

  res.json({
    message: 'You changed password correctly!'
  });
}

const verifyEmail = async(req,res, next) => {
  const {tokenVerifyEmail} = req.body
  let decodedToken;
  try{
    decodedToken = await jwt.verify(tokenVerifyEmail, process.env.JWT_KEY);
  } catch (e){
    const error = new HttpError('user not verified', 403)
    return next(error)
  }

  try{
    await User.findByIdAndUpdate(decodedToken.userId, {verifiedEmail:true}, {new:true})
  } catch (e){
    const error = new HttpError('not exist', 403)
    return next(error)
  }

  const message = `
  Your Account is Verified
  `

  const data = {
    to: decodedToken.email,
    from: 'info@plwebsites.de',
    subject: `Your Account is Verified - YourCustomer`,
    text: message,
    html: message.replace(/\r\n/g, '<br>'),
  }

  sgMail
    .send(data)
    .catch((e) => {
      console.error(e)
    })
  console.log(data)
  console.log('sent')

  res.status(200).json({message: 'You Verified Email Correct. Now Log in!'})
}

const repairSomething = async (req, res, next) => {
  const userId = '';
  let allVisits;
  try {
    // 1

    // allVisits = await Customer.find({breed: {label: 'frise bichon', value: 'frise bichon'}}).populate('visits').exec(async (err,customers) => {
    //   for (const customer of customers) {
    //     console.log(customer)
    //     for (const visit of customer.visits) {
    //       visit.premium = [{label: 'Premium', value: '5'},{label: 'Bichon', value: '10'}]
    //       console.log(visit.premium)
    //       await visit.save()
    //     }
    //   }
    // })
    // console.log('allVisits', allVisits)
    // allVisits = allVisit.find({premium: {label: "No"}})

  //  2
  //     allVisits = await Visit.find({user: userId}).updateMany({price: {label: "Small 40", value: "40 WelcomeVisit Small"}}, {service: 'WelcomeVisit'})


    // @@@@@@@ Change URL Photo (Optimization Image - Transformation) @@@@@@@@@@@@@@@@@@
    // allVisits = await Visit.find({}).then(async (visits)=>{
    //   console.log(visits)
    //   await visits.forEach(visit => {
    //     if(visit.photo){
    //       const splitted = visit.photoBigSize
    //       const splittedCopy = splitted.split('/')
    //       splittedCopy.splice(6,0,'w_500,q_30')
    //       const splittedCopyJoined = splittedCopy.join('/')
    //       console.log(visit.photo)
    //       console.log(splittedCopyJoined)
    //       Be Careful => visit.photo = splittedCopyJoined
    //       visit.save()
    //     }
    //   })
    // })

  } catch (e) {
    const error = new HttpError(e, 500);
    return next(error);
  }
  // res.send({visits: thisCustomer.visits.map((item)=>item.toObject({getters:true}))})
  res.send({ allVisits });
};

const getCustomer = async (req, res, next) => {
  const userId = req.params.id;
  const customerId = req.params.customerId
  let customer;
  try {
    customer = await Customer.find({ user: userId, _id:customerId }).populate('visits');
  } catch (e) {
    const error = new HttpError(e, 500);
    return next(error);
  }
  // res.send({visits: thisCustomer.visits.map((item)=>item.toObject({getters:true}))})
  res.send(customer);
};

const changeDataAccount = async (req, res, next) => {
  const {email, name, password, userId, timestamp} = req.body
  const dataToChange = {email, name}

  let existingUser;
  try {
    existingUser = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      'Something wrong, please try again later.',
      500
    );
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError(
      'User does not exist, try again.',
      403
    );
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      'Something wrong, please check your credentials and try again.',
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError(
      'Invalid password, could not change data.',
      403
    );
    return next(error);
  }
  let changedUser;
  try {
    changedUser = await User.findByIdAndUpdate(userId, dataToChange, {new: true});
  } catch (err) {
    const error = new HttpError(
      'Something wrong, please try again later.',
      500
    );
    return next(error);
  }

  res.json({
    userId: changedUser.id,
    email: changedUser.email,
    name: changedUser.name,
  });
};

const changeRoleOnAccount = async (req, res, next) => {
  const {email, role, userId, timestamp} = req.body
  const dataToChange = {role}
  console.log('changed new Role', role)
  let existingUser;
  try {
    existingUser = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      'Something wrong, please try again later.',
      500
    );
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError(
      'User does not exist, try again.',
      403
    );
    return next(error);
  }

  let changedUser;
  try {
    changedUser = await User.findByIdAndUpdate(userId, dataToChange, {new: true});
  } catch (err) {
    const error = new HttpError(
      'Something wrong, please try again later.',
      500
    );
    return next(error);
  }

  res.json({
    userId: changedUser.id,
    email: changedUser.email,
    name: changedUser.name,
    role: changedUser.role,
  });
};

const changePassword = async (req, res, next) => {
  const {oldPassword, newPassword, repeatedNewPassword, userId, timestamp} = req.body

  let existingUser;
  try {
    existingUser = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      'Something wrong, please try again later.',
      500
    );
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError(
      'User does not exist, try again.',
      403
    );
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(oldPassword, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      'Something wrong, please check your credentials and try again.',
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError(
      'Invalid password, could not change data.',
      403
    );
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(newPassword, 12);
  } catch (err) {
    const error = new HttpError(
      'Could not create new password, please try again.',
      500
    );
    return next(error);
  }

  let userChangedPassword;
  try {
    userChangedPassword = await User.findByIdAndUpdate(userId, {password: hashedPassword});
  } catch (err) {
    const error = new HttpError(
      'Something wrong, please try again later.',
      500
    );
    return next(error);
  }

  res.json({
    message: 'You changed password correctly!'
  });
};

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
    breed,
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
  let photoBigSize;
  if (!(userId === req.userData.userId)) {
    const error = new HttpError('You are not allowed to add a Customer', 401);
    return next(error);
  }
  if (image) {
    try {
      uploadResponse = await cloudinary.uploader.upload(image, {
        upload_preset: 'ml_default'
      });
    } catch (e) {
      const error = new HttpError('something wrong with upload image', 500);
      return next(error);
    }
    if (uploadResponse) {
      photoBigSize = uploadResponse.secure_url
      const splitted = photoBigSize
      const splittedCopy = splitted.split('/')
      splittedCopy.splice(6,0,'w_500,q_30')
      const splittedCopyJoined = splittedCopy.join('/')
      photo = splittedCopyJoined
    } else {
      photo = null;
      photoBigSize = null;
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
    breed,
    timestamp,
    user: userId
  });

  const newVisit = new Visit({
    visit,
    hour,
    shop,
    service: price.value.split(' ')[1],
    price,
    premium,
    tip,
    extraPay,
    time,
    behavior,
    comments,
    photo,
    photoBigSize,
    customer: newCustomer._id,
    timestamp,
    addedDate,
    user: userId,
    size: price.value.split(' ')[2]
  });

  try {
    await newCustomer.visits.push(newVisit);
    await newVisit.save();
  } catch (e) {
    const error = new HttpError(e, 500);
    return next(error);
  }

  let existingUser;
  try {
    existingUser = await User.findById(userId);
    await existingUser.customers.push(newCustomer);
    await existingUser.visits.push(newVisit);
    await newCustomer.save();
    await existingUser.save();
  } catch (e) {
    const error = new HttpError(e, 500);
    res.send(error);
    return next(error);
  }

  res.send({ newCustomer });
};

const getVisits = async (req, res, next) => {
  const userId = req.params.id;
  let allVisits;
  try {
    allVisits = await Visit.find({ user: userId }).populate('customer');
  } catch (e) {
    const error = new HttpError(e, 500);
    return next(error);
  }
  // res.send({visits: thisCustomer.visits.map((item)=>item.toObject({getters:true}))})
  res.send({ allVisits });
};

const getCustomers = async (req, res, next) => {
  const userId = req.params.id;
  let allCustomers;
  try {
    allCustomers = await Customer.find({ user: userId }).populate('visits');
  } catch (e) {
    const error = new HttpError(e, 500);
    return next(error);
  }
  // res.send({visits: thisCustomer.visits.map((item)=>item.toObject({getters:true}))})
  res.send({ allCustomers });
};

const customerDetails = async (req, res, next) => {
  const { id } = req.params;
  let customer;
  try {
    customer = await Customer.findById(id).populate('visits');
  } catch (e) {
    const error = new HttpError('Something wrong with ID Customer', 500);
    return next(error);
  }
  if (!(customer.user.toString() === req.userData.userId)) {
    const error = new HttpError('You are not allowed to see customer details', 401);
    return next(error);
  }
  res.send(customer);
};

const visitDetails = async (req, res, next) => {
  const { id } = req.params;
  let visit;
  try {
    visit = await Visit.findById(id).populate('customer');
  } catch (e) {
    const error = new HttpError('Something wrong with ID Visit', 500);
    return next(error);
  }
  if (!(visit.user.toString() === req.userData.userId)) {
    const error = new HttpError('You are not allowed to see these visits', 401);
    return next(error);
  }
  res.send(visit);
};

const editCustomer = async (req, res, next) => {
  const { id } = req.params;
  const body = req.body;
  if (!(body.userId === req.userData.userId)) {
    const error = new HttpError('You are not allowed to edit details Customer', 401);
    return next(error);
  }
  let customer;
  try {
    customer = await Customer.findByIdAndUpdate(id, body);
  } catch (e) {
    const error = new HttpError('Something wrong with ID Customer', 500);
    return next(error);
  }
  res.send(customer);
};

const addVisit = async (req, res, next) => {
  const { id } = req.params;
  const {
    visit,
    hour,
    shop,
    price,
    premium,
    tip,
    extraPay,
    time,
    behavior,
    comments,
    image,
    timestamp,
    addedDate,
    userId
  } = req.body;

  if (!(userId === req.userData.userId)) {
    const error = new HttpError('You are not allowed to add Visit', 401);
    return next(error);
  }

  let uploadResponse;
  let photo;
  let photoBigSize;
  if (image) {
    try {
      uploadResponse = await cloudinary.uploader.upload(image, {
        upload_preset: 'ml_default'
      });
    } catch (e) {
      const error = new HttpError('something wrong with upload image', 500);
      return next(error);
    }
    if (uploadResponse) {
      photoBigSize = uploadResponse.secure_url
      const splitted = photoBigSize
      const splittedCopy = splitted.split('/')
      splittedCopy.splice(6,0,'w_500,q_30')
      const splittedCopyJoined = splittedCopy.join('/')
      photo = splittedCopyJoined
    } else {
      photo = null;
      photoBigSize = null;
    }
  }
  const newVisit = new Visit({
    visit,
    hour,
    shop,
    service: price.value.split(' ')[1],
    price,
    premium,
    tip,
    extraPay,
    time,
    behavior,
    comments,
    photo,
    photoBigSize,
    customer: id,
    timestamp,
    addedDate,
    size: price.value.split(' ')[2],
    user: userId
  });
  let customer;
  let existingUser;
  try {
    existingUser = await User.findById(userId);
    customer = await Customer.findById(id);
    await existingUser.visits.push(newVisit);
    await customer.visits.push(newVisit);
    await existingUser.save();
    await newVisit.save();
    await customer.save();
  } catch (e) {
    const error = new HttpError('Something wrong with ID Customer', 500);
    return next(error);
  }
  res.send({ customer });
};

const editVisit = async (req, res, next) => {
  const { id } = req.params;
  const body = req.body;
  const { image } = req.body;
  if (!(body.userId === req.userData.userId)) {
    const error = new HttpError('You are not allowed to edit this place', 401);
    return next(error);
  }
  let uploadResponse;
  let photo;
  let photoBigSize;
  if (image) {
    try {
      uploadResponse = await cloudinary.uploader.upload(image, {
        upload_preset: 'ml_default'
      });
    } catch (e) {
      const error = new HttpError('something wrong with upload image', 500);
      return next(error);
    }
    if (uploadResponse) {
      photoBigSize = uploadResponse.secure_url
      console.log(photoBigSize)
      const splitted = photoBigSize
            const splittedCopy = splitted.split('/')
            splittedCopy.splice(6,0,'w_500,q_30')
            const splittedCopyJoined = splittedCopy.join('/')
      photo = splittedCopyJoined
    } else {
      photo = null;
    }
  }
  body.photo = photo;
  body.photoBigSize = photoBigSize;
  body.size = body.price.value.split(' ')[2]
  body.service = body.price.value.split(' ')[1]


  let visit;
  try {
    visit = await Visit.findByIdAndUpdate(id, body);
  } catch (e) {
    const error = new HttpError('Something wrong with ID Visit', 500);
    return next(error);
  }
  res.send(visit);
};

const getVisitsCustomer = async (req, res, next) => {
  const { id } = req.params;
  let visits;
  try {
    visits = await Customer.findById(id).populate('visits');
  } catch (e) {
    const error = new HttpError('Something wrong with ID Customer', 500);
    return next(error);
  }
  res.send(visits);
};

const login = async (req, res, next) => {
  const email = req.body.emailLogin;
  const password = req.body.passwordLogin;
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
  console.log(existingUser)
  if (!existingUser) {
    const error = new HttpError(
      'Invalid credentials, could not log you in.',
      403
    );
    return next(error);
  }
  if(existingUser.verifiedEmail === false) return next(new HttpError(
    'You need verify email.',
    403
  ))

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
      { userId: existingUser.id, email: existingUser.email, role: existingUser.role },
      `${process.env.JWT_KEY}`,
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
    name: existingUser.name,
    role: existingUser.role,
    exp: Date.now() + 1000 * 60 * 60
  });
};

const signup = async (req, res, next) => {

  // const errors = validationResult(req);
  // if (!errors.isEmpty()) {
  //   return next(
  //     new HttpError('Invalid inputs passed, please check your data.', 422)
  //   );
  // }
  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later 3.',
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
    verifiedEmail: false,
    role: 'Basic'
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later 2.',
      500
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email, role: createdUser.role, verifiedEmail: createdUser.verifiedEmail },
      `${process.env.JWT_KEY}`,
      { expiresIn: '1h' }
    );
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later 1.',
      500
    );
    return next(error);
  }

  const message = `
  Link to verify Account for YourCustomer  - https://your-customer.netlify.app/verifyEmail/${token}
  `
  const data = {
    to: email,
    from: 'info@plwebsites.de',
    subject: `Link to verify Account - YourCustomer`,
    text: message,
    html: message.replace(/\r\n/g, '<br>'),
  }

  sgMail
    .send(data)
    // .then(() => {
    //   return res.status(200).json({ status: 'Ok' })
    // })
    .catch((e) => {
      console.error(e)
    })
  console.log(data)
  console.log('sent')

  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, name: createdUser.name, role: createdUser.role });

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
exports.changeDataAccount = changeDataAccount;
exports.changePassword = changePassword;
exports.repairSomething = repairSomething;
exports.getCustomer = getCustomer;
exports.changeRoleOnAccount = changeRoleOnAccount;
exports.proceedBuy = proceedBuy;
exports.verifyEmail = verifyEmail;
exports.sendEmailToResetPassword = sendEmailToResetPassword;
exports.setNewPassword = setNewPassword;