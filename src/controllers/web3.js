const Web3 = require('web3');
const Redis = require('ioredis');
const ethers = require('ethers');
const { Web3AxiosProvider } = require('web3-providers-axios');
const config = require('./config');
const { debug, error } = require('../helpers/debug');
const { ignoreError } = require('../helpers/utils');

/**
  Web3 manager & Health monitor for Ethereum Nodes

  Minimal implementation of https://github.com/cubedro/eth-net-intelligence-api/blob/master/lib/node.js
**/
class NodeManager {
  constructor() {
    this.redis = new Redis(config.redis);
    this.nodes = config.rpc;
    this.blockNumber = 0;
    this.web3 = this.getWeb3();
    this.provider = this.getProvider();
    this.ethers_provider = this.getEthersProvider();
    setInterval(() => ignoreError(this.updateWeb3.bind(this)), 1000);
  }
  getWeb3(node) {
    const web3 = node ? new Web3(new Web3AxiosProvider(node, undefined, { retryMax: config.retryMax, retrySec: config.retrySec })) : new Web3(new Web3AxiosProvider(this.nodes, undefined, { retryMax: config.retryMax, retrySec: config.retrySec }));
    return web3;
  }
  getProvider(node) {
    const provider = node ? new Web3AxiosProvider(node, undefined, { retryMax: config.retryMax, retrySec: config.retrySec }) : new Web3AxiosProvider(this.nodes, undefined, { retryMax: config.retryMax, retrySec: config.retrySec });
    return provider;
  }
  getEthersProvider(node) {
    const provider = node ? new ethers.providers.Web3Provider(new Web3AxiosProvider(node, undefined, { retryMax: config.retryMax, retrySec: config.retrySec })) : new ethers.providers.Web3Provider(new Web3AxiosProvider(this.nodes, undefined, { retryMax: config.retryMax, retrySec: config.retrySec }));
    return provider;
  }
  async updateWeb3() {
    const redis = this.redis;
    const nodes = await redis.get('faucet:nodes');
    if (nodes && nodes !== null) {
      this.nodes = nodes;
    }
    this.web3 = this.getWeb3();
    this.provider = this.getProvider();
    this.ethers_provider = this.getEthersProvider();
    const blockNumber = await redis.get('faucet:block');
    if (blockNumber && blockNumber !== null) {
      this.blockNumber = parseInt(blockNumber);
    }
  }
}

class UpdateManager extends NodeManager {
  constructor() {
    super();
    // Blocks produced per hour
    this.blocksHour = parseInt(3600 / config.blockTime);
    this.update();
    setInterval(() => ignoreError(this.update.bind(this)), config.blockTime * 1000);
  }
  async update() {
    await this.getLatestBlock();
    await this.healthCheck();
  }
  async getLatestBlock() {
    try {
      const web3 = this.getWeb3();
      const blockNumber = await web3.eth.getBlockNumber();
      await this.redis.set('faucet:block', parseInt(blockNumber));
      debug(`UpdateManager: ${parseInt(blockNumber)}`);
    } catch (e) {
      error('UpdateManager: Failed to get latest block');
      throw e;
    }
  }
  async getBlock(node, blockNumber) {
    try {
      const web3 = this.getWeb3(node);
      const block = await web3.eth.getBlock(blockNumber);
      debug(`UpdateManager: ${node}:${block.number}`);
      return block;
    } catch (e) {
      error(`UpdateManager: Failed to get latest block from ${node}`);
      return null;
    }
  }
  async healthCheck() {
    const blockNumber = await this.redis.get('faucet:block');
    let tests = config.rpc.replace(/\s+/g, '').split(',').map(async (node) => {
      // Fetch past block, if not available the expected result is null
      const number = parseInt(blockNumber) - this.blocksHour;
      const block = await this.getBlock(node, number);
      const testResult = (block === null) ? false : true;
      return {
        node,
        test: testResult
      };
    });
    tests = await Promise.all(tests);
    tests = tests.filter(t => t.test);
    const result = tests.map(t => t.node).join(', ');
    await this.redis.set('faucet:nodes', result);
    debug(`UpdateManager: Updated node list: ${result}`);
  }
}

module.exports = new NodeManager();
module.exports.UpdateManager = UpdateManager;
