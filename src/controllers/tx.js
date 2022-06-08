const RedisQueue = require('./queue');
const NodeManager = require('./web3');
const config = require('./config');
const { debug, error } = require('../helpers/debug');
const { parsePrivateKey } = require('../helpers/blockchain-helper');
const constants = require('../constants');
const { toWei } = require('web3-utils');
const { TxManager: Manager } = require('tx-manager');
const BigNumber = require('bignumber.js');
BigNumber.config({ EXPONENTIAL_AT: 1e+9 });

/**
  Process Ethereum Transactions

  Ported from https://github.com/tornadocash/tornado-relayer/blob/582af773e65be407bdce7bbe0e75a0b406075560/src/worker.js
**/
class TxManager extends RedisQueue {
  constructor() {
    super();
    this.manager = new Manager({
      privateKey: parsePrivateKey(),
      rpcUrl: NodeManager.nodes.replace(/\s+/g, '').split(',')[0],
      config: {
        'MAX_RETRIES': config.retryMax,
        'CONFIRMATIONS': config.confirmations,
        'THROW_ON_REVERT': false,
        'ENABLE_EIP1559': config.eip1559,
      },
      provider: NodeManager.ethers_provider
    });
    this.queue.process(this.processJob.bind(this));
  }
  async processJob(job, done) {
    const receiver = job.data.receiver;
    try {
      await this.updateStatus(receiver, 'ACCEPTED');
      const txObject = {
        to: receiver,
        value: toWei(config.EtherToTransfer)
      };
      const currentTx = await this.manager.createTx(txObject);
      await currentTx
        .send()
        .on('transactionHash', txHash => {
          this.updateTxHash(receiver, txHash);
          this.updateStatus(receiver, 'SENT');
        })
        .on('mined', receipt => {
          debug(`Mined in block ${receipt.blockNumber}`);
          this.updateStatus(receiver, 'MINED');
        })
        .on('confirmations', confirmations => {
          this.updateConfirmations(receiver, confirmations);
          this.updateStatus(receiver, 'CONFIRMED');
          if (confirmations === config.confirmations) {
            // Clear unnecessary redis key value after one minute
            setTimeout(() => this.cleanJob(receiver), 60000);
            done();
          }
        });
    } catch (e) {
      error(`TxManager: Failed to process transaction behalf ${receiver}`);
      error(e);
      await this.resetJob(receiver);
      done();
    }
  }
  async updateStatus(receiver, status) {
    const formatted = NodeManager.web3.utils.toChecksumAddress(receiver);
    await this.redis.setex(`faucet:user:${formatted}`, 86400, constants.status[status]);
    if (constants.status[status] === 'ACCEPTED') {
      await this.redis.del(`faucet:txid:${formatted}`);
      await this.redis.del(`faucet:confirm:${formatted}`);
    }
    debug(`TxManager: Job status updated ${status} for ${formatted}`);
  }
  async updateTxHash(receiver, txid) {
    const formatted = NodeManager.web3.utils.toChecksumAddress(receiver);
    await this.redis.setex(`faucet:txid:${formatted}`, 86400, txid);
    debug(`TxManager: Successfully sent tx ${config.explorer}/tx/${txid} for ${config.explorer}/address/${receiver}`);
  }
  async updateConfirmations(receiver, confirmations) {
    const formatted = NodeManager.web3.utils.toChecksumAddress(receiver);
    await this.redis.setex(`faucet:confirm:${formatted}`, 86400, confirmations);
    debug(`TxManager: Confirmations count ${confirmations} for ${formatted}`);
  }
  async resetJob(receiver) {
    const formatted = NodeManager.web3.utils.toChecksumAddress(receiver);
    const ip = this.redis.get(`faucet:info:${formatted}`);
    await this.redis.del(`faucet:ip:${ip}`);
    await this.redis.del(`faucet:info:${formatted}`);
    await this.redis.del(`faucet:user:${formatted}`);
    await this.redis.del(`faucet:txid:${formatted}`);
    await this.redis.del(`faucet:confirm:${formatted}`);
  }
  /**
    Clear unnecessary redis information after the job is finished
  **/
  async cleanJob(receiver) {
    const formatted = NodeManager.web3.utils.toChecksumAddress(receiver);
    await this.redis.setex(`faucet:user:${formatted}`, 86400, constants.status['FINISHED']);
    await this.redis.del(`faucet:info:${formatted}`);
    await this.redis.del(`faucet:txid:${formatted}`);
    await this.redis.del(`faucet:confirm:${formatted}`);
    let ethSpent = await this.redis.get('faucet:spent');
    if (ethSpent === null) {
      ethSpent = 0;
    }
    await this.redis.set('faucet:spent', new BigNumber(ethSpent).plus(new BigNumber(toWei(config.EtherToTransfer))).toString());
  }
}

module.exports = new TxManager();
