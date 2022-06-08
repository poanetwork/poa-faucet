const TelegramBot = require('node-telegram-bot-api');
const Redis = require('ioredis');
const { isAddress, toChecksumAddress } = require('web3-utils');
const process = require('process');
const { debug, error } = require('../helpers/debug');
const config = require('./config');

const BotService = async () => {
  if (config.telegram_bot !== true) {
    // Don't exit the process
    setInterval(() => {}, 1 << 30);
    return;
  }
  debug('Starting Telegram Bot Service');
  try {
    const redis = new Redis(config.redis);
    const bot = new TelegramBot(config.telegram_api, { polling: true });

    bot.onText(/\/register (.+)/, async (msg, match) => {
      const resp = match[1];

      if (!isAddress(resp)) {
        bot.sendMessage(
          msg.chat.id,
          'Please enter your wallet address, command should be /register <address>"'
        );
        return;
      }
      const address = toChecksumAddress(resp);
      await redis.setex(`faucet:bot:${address}`, 86400, 'true');
      bot.sendMessage(
        msg.chat.id,
        `Wallet ${address} registered`
      );
    });
  } catch (e) {
    error('BotService: Catched Error while running bot service');
    error(e);
    process.exit(1);
  }
};

module.exports = BotService;
