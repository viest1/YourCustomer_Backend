const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');

module.exports = async(req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }
  try {
    const token = req.headers.authorization.split(' ')[1]; // Authorization: 'Bearer TOKEN'
    if (!token) {
      throw new Error('Authentication failed!');
    }
    console.log(token)
    console.log('yey')
    const decodedToken = await jwt.verify(token, process.env.JWT_KEY);
    console.log('yey2')
    console.log('yey3', decodedToken)
    req.userData = { userId: decodedToken.userId };
    next();
  } catch (err) {
    const error = new HttpError('Authentication failed!', 403);
    return next(error);
  }
};