const express = require('express');
const { check } = require('express-validator');

const usersController = require('../controllers/usersControllers');

const router = express.Router();


router.post('/customers/add', usersController.addCustomer);
router.post('/customers/:id', usersController.customerDetails);
router.get('/user/:id/visits', usersController.getVisits);
router.get('/user/:id/customers', usersController.getCustomers);
router.get('/customers/:id/visits', usersController.getVisitsCustomer);
router.post('/visits/:id', usersController.visitDetails);
router.patch('/customers/:id/addVisit', usersController.addVisit);
router.patch('/customers/:id', usersController.editCustomer);
router.patch('/visits/:id', usersController.editVisit);
router.post('/signup', [
 check('name')
    .not()
    .isEmpty(),
  check('email')
    .normalizeEmail()
    .isEmail(),
  check('password').isLength({ min: 6 })
], usersController.signup);

router.post('/login', usersController.login);

module.exports = router;