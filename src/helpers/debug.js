const config = require('../controllers/config');

const debug = (string) => {
  if (config.debug === true) {
    console.log(string);
  }
};

const error = (string) => {
  if (config.error === true) {
    console.error(string);
  }
};

module.exports = {
  debug,
  error
};
