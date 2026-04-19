'use strict';

const { Router } = require('express');
const { body, query, param } = require('express-validator');
const {
  createTask,
  getTasks,
  getTaskById,
  deleteTask,
  retryTask,
  getTaskStats,
} = require('../controllers/task.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { OPERATION_TYPES } = require('../models/task.model');

const router = Router();

// All task routes require authentication
router.use(authenticate);

const createTaskValidation = [
  body('title').trim().notEmpty().isLength({ min: 1, max: 100 }).withMessage('Title must be 1-100 characters'),
  body('inputText').trim().notEmpty().isLength({ min: 1, max: 5000 }).withMessage('Input text must be 1-5000 characters'),
  body('operation').isIn(OPERATION_TYPES).withMessage(`Operation must be one of: ${OPERATION_TYPES.join(', ')}`),
];

const getTasksValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('status').optional().isIn(['pending', 'running', 'success', 'failed', 'all']).withMessage('Invalid status filter'),
  query('search').optional().isLength({ max: 100 }).withMessage('Search query too long'),
];

const idValidation = [
  param('id').isMongoId().withMessage('Invalid task ID'),
];

router.get('/stats', getTaskStats);
router.get('/', getTasksValidation, validate, getTasks);
router.post('/', createTaskValidation, validate, createTask);
router.get('/:id', idValidation, validate, getTaskById);
router.delete('/:id', idValidation, validate, deleteTask);
router.post('/:id/retry', idValidation, validate, retryTask);

module.exports = router;
