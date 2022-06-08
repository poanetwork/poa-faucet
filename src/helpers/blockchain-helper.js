const NodeManager = require('../controllers/web3');
const config = require('../controllers/config');
const BigNumber = require('bignumber.js');

/** Parse private key including prefix **/
const parsePrivateKey = () => {
  const privateKey = config.privateKey;
  if (!privateKey) {
    throw new Error('Faucet Private Key not available');
  }
  if (privateKey.includes('0x')) {
    return privateKey.substring(2);
  }
  return privateKey;
};

const refreshBalance = async () => {
  const { web3 } = NodeManager;
  const account = web3.eth.accounts.privateKeyToAccount(`0x${parsePrivateKey()}`).address;
  const balance = await web3.eth.getBalance(account);
  if (!balance) {
    throw new Error('Balance not available');
  }
  return new BigNumber(balance).toString();
};

module.exports = {
  parsePrivateKey,
  refreshBalance
};
