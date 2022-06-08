const { debug, error } = require('./debug');

const generateErrorResponse = (response, err) => {
  const errorResponse = {
    code: err.code || 500,
    title: err.title || 'Error',
    message:  err.message || 'Internal server error'
  };
  error(err);
  response.status(errorResponse.code).send(errorResponse);
};

const generateSuccessResponse = (response, success) => {
  const successResponse = {
    code: 200,
    title: 'Success',
    ...success
  };
  debug(success);
  response.status(successResponse.code).send(successResponse);
};

module.exports = {
  generateErrorResponse,
  generateSuccessResponse
};
