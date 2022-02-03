const express = require('express');
const { check } = require('express-validator');
const checkAuth = require('../middlewares/checkAuth')

const usersController = require('../controllers/usersControllers');

const router = express.Router();

// Route to repair something
// router.get('/repairSomething', usersController.repairSomething);

// login/signup Routes
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

// check Authorization
router.use(checkAuth)

// premium Routes
router.get('/user/:id/visits/role/:role', usersController.getVisits);
router.get('/user/:id/customers/role/:role',   usersController.getCustomers);

// basic Routes
router.get('/user/:id/customer/:customerId', usersController.getCustomer)
router.get('/user/:id/visits', usersController.getVisits);
router.get('/user/:id/customers', usersController.getCustomers);
router.get('/customers/:id/visits', usersController.getVisitsCustomer);

router.post('/customers/add', usersController.addCustomer);
router.post('/customers/:id', usersController.customerDetails);
router.post('/visits/:id', usersController.visitDetails);
router.post('/proceedBuy', usersController.proceedBuy);

router.patch('/changeRoleOnAccount', usersController.changeRoleOnAccount);
router.patch('/changeDataAccount', usersController.changeDataAccount);
router.patch('/changePassword', usersController.changePassword);
router.patch('/customers/:id', usersController.editCustomer);
router.patch('/customers/:id/addVisit', usersController.addVisit);
router.patch('/visits/:id', usersController.editVisit);

module.exports = router;