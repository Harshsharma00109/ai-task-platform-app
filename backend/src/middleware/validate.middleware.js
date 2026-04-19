'use strict';

const { validationResult } = require('express-validator');
const { sendError } = require('../utils/response');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return sendError(res, 'Validation failed', 422, formattedErrors);
  }
  next();
}

module.exports = { validate };
