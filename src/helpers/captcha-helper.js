const axios = require('axios-auto');
const { debug, error } = require('./debug');
const config = require('../controllers/config');

const validateCaptcha = async (receiver, captchaResponse) => {
  const { captcha_type, captcha_secret } = config;

  const post_data = JSON.stringify({
    ...{ captcha_type, captcha_secret },
    receiver,
    response: captchaResponse
  });

  debug(post_data);

  const captchaUrl = (captcha_type === 'hCaptcha') ? 'https://hcaptcha.com' : 'https://www.google.com/recaptcha/api';
  const axios_url = `${captchaUrl}/siteverify?secret=${captcha_secret}&response=${captchaResponse}`;
  const axios_options = {
    retryMax: config.retryMax,
    retrySec: config.retrySec
  };

  try {
    const result = (captcha_type === 'hCaptcha') ? await axios.get(axios_url, axios_options) : await axios.post(axios_url, undefined, axios_options);
    if (result.success !== true) {
      throw new Error(`Captcha test failed ${JSON.stringify(result)}`);
    }
    return true;
  } catch (e) {
    error(`Failed to verify captcha response for ${receiver}`);
    return false;
  }
};

module.exports = validateCaptcha;
