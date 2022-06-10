const { error } = require('../helpers/debug');
const { status } = require('../constants');
const config = require('./config');

const Queue = require('bull');
const Redis = require('ioredis');

/**
  Build new Job queue using redis & bull

  Forked from tornado-relayer
  https://github.com/tornadocash/tornado-relayer/blob/142e6267453a929915bcc6ea958deb2ac7035eff/src/queue.js
**/
class RedisQueue {
  constructor() {
    this.redisUrl = config.redis;
    this.redis = new Redis(this.redisUrl);
    this.queue = this.init();
  }

  init() {
    return new Queue('faucet', this.redisUrl, {
      lockDuration:      300000, // Key expiration time for job locks.
      lockRenewTime:     30000,  // Interval on which to acquire the job lock
      stalledInterval:   30000,  // How often check for stalled jobs (use 0 for never checking).
      maxStalledCount:   3,      // Max amount of times a stalled job will be re-processed.
      guardInterval:     5000,   // Poll interval for delayed jobs and added jobs.
      retryProcessDelay: 5000,   // delay before processing next job in case of internal error.
      drainDelay:        5,      // A timeout for when the queue is in drained state (empty waiting for jobs).
    });
  }

  async postJob(ip, receiver) {
    try {
      await this.queue.add({
        receiver
      },
      {
        removeOnComplete: true,
        removeOnFail: true
      });

      // Save on redis for one day
      await this.redis.setex(`faucet:ip:${ip}`, 86400, status.QUEUED);
      await this.redis.setex(`faucet:info:${receiver}`, 86400, `${ip}`);
      await this.redis.setex(`faucet:user:${receiver}`, 86400, status.QUEUED);
      return true;
    } catch (e) {
      error(e);
      return false;
    }
  }

  async getJobCounts() {
    return await this.queue.getJobCounts();
  }
}

module.exports = RedisQueue;
