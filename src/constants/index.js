const messages = Object.freeze({
  ELIGIBLE: 'Eligible Address',
  ALREADY_CLAIMED: 'You have already claimed, try again later',
  INVALID_CAPTCHA: 'Invalid captcha',
  INVALID_ADDRESS: 'Invalid address',
  JOB_QUEUED: 'Job has been queued',
  TX_HAS_BEEN_MINED_WITH_FALSE_STATUS: 'Transaction has been mined, but status is false',
  TX_HAS_BEEN_MINED: 'Tx has been mined',
});

const status = Object.freeze({
  QUEUED: 'QUEUED',
  ACCEPTED: 'ACCEPTED',
  SENT: 'SENT',
  MINED: 'MINED',
  RESUBMITTED: 'RESUBMITTED',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
  FINISHED: 'FINISHED',
});

module.exports = {
  messages,
  status
};
