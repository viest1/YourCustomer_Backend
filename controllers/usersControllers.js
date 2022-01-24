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
      const optimizedUrl = uploadResponse.secure_url;
      optimizedUrl.split('/').splice(6,0,'w_500,q_30').join('/')
      photo = optimizedUrl
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
      const optimizedUrl = uploadResponse.secure_url;
      optimizedUrl.split('/').splice(6,0,'w_500,q_30').join('/')
      photo = optimizedUrl
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
      const optimizedUrl = uploadResponse.secure_url;
      optimizedUrl.split('/').splice(6,0,'w_500,q_30').join('/')
      photo = optimizedUrl
    } else {
      photo = null;
    }
  }
  body.photo = photo;
  body.photoBigSize = photoBigSize;
  body.size = body.price.value.split(' ')[2]
  body.service = body.price.value.split(' ')[1]
  console.log(body)


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
      `${process.env.JWT_KEY}`,
      { expiresIn: '30days' }
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
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7
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
    password: hashedPassword
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
      { expiresIn: '30days' }
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
    .json({ userId: createdUser.id, email: createdUser.email, name: createdUser.name, token: token });

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
