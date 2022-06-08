const express = require('express');
const bodyParser = require('body-parser');
const { isAddress, fromWei } = require('web3-utils');

const path = require('path');
const process = require('process');

const RedisQueue = require('./controllers/queue');
const { refreshBalance, parsePrivateKey } = require('./helpers/blockchain-helper');
const { generateErrorResponse, generateSuccessResponse } = require('./helpers/generate-response');
const validateCaptcha = require('./helpers/captcha-helper');
const { debug, error } = require('./helpers/debug');
const { messages } = require('./constants');

const config = require('./controllers/config');
const NodeManager = require('./controllers/web3');
const { ignoreError } = require('./helpers/utils');

const Faucet = () => {
  const queue = new RedisQueue();
  const Redis = queue.redis;
  const Queue = queue.queue;
  const app = express();
  console.log(config);

  let state = {};

  state.captchaType = config.captcha ? config.captcha_type : null;
  state.siteKey = config.captcha ? config.captcha_siteKey : null;
  state.chainId = 0;
  state.address = NodeManager.web3.eth.accounts.privateKeyToAccount(`0x${parsePrivateKey()}`).address;
  state.balance = '0';

  NodeManager.web3.eth.getChainId().then(r => state.chainId = r);

  const refreshFaucetBalance = async () => {
    try {
      state.balance = await refreshBalance();
      debug(`Faucet balance: ${fromWei(state.balance, 'ether')} ${config.netSymbol}`);
    } catch (e) {
      error('Faucet: Failed to update faucet balance');
      throw e;
    }
  };
  refreshFaucetBalance();
  setInterval(() => ignoreError(refreshFaucetBalance), 60000);

  if (config.static === true) {
    app.use(express.static(path.join(process.cwd(), 'public')));
  }
  app.use(bodyParser.json({
    limit: '2mb',
  }));
  app.use(bodyParser.urlencoded({
    limit: '2mb',
    extended: true,
  }));

  app.get('/', (request, response) => {
    response.send(`${config.netName} faucet`);
  });

  app.post('/', async (req, res) => {
    debug('REQUEST:');
    debug(req.body);
    /**
      Check client's IP and Ethereum Address
    **/
    let rawIp = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (rawIp.substr(0, 7) == '::ffff:') {
      rawIp = rawIp.substr(7);
    }
    let receiver = req.body.receiver;
    debug(`Faucet: ${receiver} from ${rawIp}`);

    if (!isAddress(receiver)) {
      return generateErrorResponse(res, {
        message: messages.INVALID_ADDRESS,
      });
    }
    receiver = NodeManager.web3.utils.toChecksumAddress(receiver);

    if (config.limitRequest === true) {
      const ipAddress = await Redis.get(`faucet:ip:${rawIp}`);

      if (ipAddress !== null) {
        return generateErrorResponse(res, {
          message: messages.ALREADY_CLAIMED,
        });
      }

      const address = await Redis.get(`faucet:user:${receiver}`);

      if (address !== null) {
        return generateErrorResponse(res, {
          message: messages.ALREADY_CLAIMED,
        });
      }
    }

    if (state.captchaType !== null) {
      const captchaResponse = (state.captchaType === 'hCaptcha') ? req.body['h-captcha-response'] : req.body['g-recaptcha-response'];
      if (!captchaResponse) {
        return generateErrorResponse(res, {
          message: messages.INVALID_CAPTCHA,
        });
      }

      const testCaptcha = await validateCaptcha(receiver, captchaResponse);
      if (!testCaptcha) {
        return generateErrorResponse(res, {
          message: messages.INVALID_CAPTCHA,
        });
      }
    }
    const result = await queue.postJob(rawIp, receiver);
    if (!result) {
      return generateErrorResponse(res, {
        message: 'Server Error',
      });
    }

    return generateSuccessResponse(res, {
      message: messages.JOB_QUEUED,
      address: receiver
    });
  });

  app.get('/health', async (req, res) => {
    const { waiting: currentQueue } = await Queue.getJobCounts();
    let ethSpent = await Redis.get('faucet:spent');
    if (ethSpent === null) {
      ethSpent = 0;
    } else {
      ethSpent = fromWei(ethSpent);
    }

    const resp = {
      blockNumber: parseInt(NodeManager.blockNumber),
      balanceInWei: state.balance,
      balanceInEth: fromWei(state.balance, 'ether'),
      currentQueue,
      ethSpent,
      timestamp: Date.now()
    };
    res.send(resp);
  });

  app.get('/config', (req, res) => {
    const resp = {
      captchaType: state.captchaType,
      chainId: state.chainId,
      confirmations: config.confirmations,
      ethPerUser: config.EtherToTransfer,
      explorer: config.explorer,
      faucetAddress: state.address,
      limitRequest: config.limitRequest,
      netName: config.netName,
      netSymbol: config.netSymbol,
      publicRpc: config.publicRpc,
      footer: config.footer,
      twitter: config.twitter,
      homepage: config.homepage,
      telegram: config.telegram,
      github: config.github,
      retryMax: config.retryMax,
      retrySec: config.retrySec,
      siteKey: state.siteKey
    };
    res.send(resp);
  });

  app.get('/query/:address', async (req, res) => {
    let rawIp = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (rawIp.substr(0, 7) == '::ffff:') {
      rawIp = rawIp.substr(7);
    }
    let receiver = req.params.address;
    debug(`Query: ${receiver} from ${rawIp}`);

    if (!isAddress(receiver)) {
      return generateErrorResponse(res, {
        message: messages.INVALID_ADDRESS,
      });
    }
    receiver = NodeManager.web3.utils.toChecksumAddress(receiver);

    if (config.limitRequest === true) {
      const ipAddress = await Redis.get(`faucet:ip:${rawIp}`);

      if (ipAddress !== null) {
        return generateErrorResponse(res, {
          message: messages.ALREADY_CLAIMED,
        });
      }

      const address = await Redis.get(`faucet:user:${receiver}`);

      if (address !== null) {
        return generateErrorResponse(res, {
          message: messages.ALREADY_CLAIMED,
        });
      }
    }

    return generateSuccessResponse(res, {
      message: messages.ELIGIBLE,
    });
  });

  app.get('/job/:address', async (req, res) => {
    let rawIp = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (rawIp.substr(0, 7) == '::ffff:') {
      rawIp = rawIp.substr(7);
    }
    let receiver = req.params.address;
    debug(`Job Status: ${receiver} from ${rawIp}`);

    if (!isAddress(receiver)) {
      return generateErrorResponse(res, {
        message: messages.INVALID_ADDRESS,
      });
    }
    receiver = NodeManager.web3.utils.toChecksumAddress(receiver);

    const status = await Redis.get(`faucet:user:${receiver}`);

    if (status === null) {
      return generateErrorResponse(res, {
        message: 'The job doesn\'t exist',
      });
    }

    const txid = await Redis.get(`faucet:txid:${receiver}`);
    const confirmations = await Redis.get(`faucet:confirm:${receiver}`);

    return generateSuccessResponse(res, {
      message: status,
      txid,
      confirmations
    });
  });

  app.set('port', (process.env.PORT || 5000));

  app.listen(app.get('port'), () => {
    console.log(`${config.netName} faucet is running on port`, app.get('port'));
  });
};

module.exports = Faucet;
