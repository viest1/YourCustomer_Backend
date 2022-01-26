const express = require('express');
const { check } = require('express-validator');
const checkAuth = require('../middlewares/checkAuth')

const usersController = require('../controllers/usersControllers');

const router = express.Router();



// router.get('/repairSomething', usersController.repairSomething);
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
router.use(checkAuth)
router.get('/user/:id/customer/:customerId', usersController.getCustomer)
router.get('/user/:id/visits', usersController.getVisits);
router.get('/user/:id/customers', usersController.getCustomers);
router.get('/customers/:id/visits', usersController.getVisitsCustomer);
router.post('/changeDataAccount', usersController.changeDataAccount);
router.post('/changePassword', usersController.changePassword);
router.patch('/customers/:id', usersController.editCustomer);
router.post('/customers/add', usersController.addCustomer);
router.post('/customers/:id', usersController.customerDetails);
router.post('/visits/:id', usersController.visitDetails);
router.patch('/customers/:id/addVisit', usersController.addVisit);
router.patch('/visits/:id', usersController.editVisit);
module.exports = router;