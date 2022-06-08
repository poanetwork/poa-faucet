const { loadConfig } = require('use-config-json');

const defaultConfig = {
  'debug': false,
  'error': true,
  'static': true,
  'limitRequest': true,
  'retryMax': 5,
  'retrySec': 10,
  'rpc': 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161, https://rpc.goerli.mudit.blog',
  'redis': 'redis://127.0.0.1:6379',
  'privateKey': '',
  'EtherToTransfer': '0.01',
  'captcha': false,
  'captcha_type': 'reCaptcha',
  'captcha_siteKey': '',
  'captcha_secret': '',
  'netName': 'Goerli Testnet',
  'netSymbol': 'ETH',
  'blockTime': 15,
  'confirmations': 5,
  'explorer': 'https://goerli.etherscan.io',
  'publicRpc': 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
  'footer': '',
  'twitter': '',
  'homepage': '',
  'telegram': '',
  'github': '',
  'eip1559': true,
};

const config = loadConfig(defaultConfig);

module.exports = config;
