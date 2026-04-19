'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const { register, login, getMe } = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

const registerValidation = [
  body('name').trim().notEmpty().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').trim().normalizeEmail().isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
];

const loginValidation = [
  body('email').trim().normalizeEmail().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.get('/me', authenticate, getMe);

module.exports = router;
