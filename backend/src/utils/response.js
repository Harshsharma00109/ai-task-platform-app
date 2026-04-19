'use strict';

function sendSuccess(res, data = {}, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

function sendError(res, message = 'An error occurred', statusCode = 500, errors = null) {
  const body = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

function sendPaginated(res, data, pagination, message = 'Success') {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { sendSuccess, sendError, sendPaginated };
