const jwt = require('jsonwebtoken');
const roleAllow = require('../data/dataSubscription')
const HttpError = require('../models/http-error');

module.exports = async(req, res, next) => {
  if (req.method === 'OPTIONS') return next();

  try {
    const token = req.headers.authorization.split(' ')[1]; // Authorization: 'Bearer TOKEN'
    if (!token) throw new Error('Authorization failed!');
    const decodedToken = await jwt.verify(token, process.env.JWT_KEY);

    // Verified Email?
    if(decodedToken.verifiedEmail === false) throw new Error('Authorization failed!');

    // Check role allow
    console.log(roleAllow)
    const arrPath = req.path.split('/')
    console.log(arrPath)
    for (let i = 0; i < roleAllow.possiblePaths.length; i++) {
      if(arrPath.includes(roleAllow.possiblePaths[i])){
        if(!(roleAllow[roleAllow.possiblePaths[i]].includes(decodedToken.role))){
          return next(new HttpError(`You need buy ${roleAllow[roleAllow.possiblePaths[i]][0]} account`, 403))
        }
      }
    }

    req.userData = { userId: decodedToken.userId };
    next();
  } catch (err) {
    const error = new HttpError('Authorization failed! 2', 403);
    return next(error);
  }
};