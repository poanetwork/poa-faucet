## Ethereum Faucet

Ethereum compatible Testnet ETH Faucet, supports multiple captcha solutions (hCaptcha and reCaptcha).

### Live

https://goerli-faucet.com

### Requirements

+ Node.js
+ Ethereum compatible blockchain node (Geth, Erigon, OpenEthereum, Nethermind, etc.) - either public or private hosted node would work.
+ Testnet ETH funded private key
+ Redis (Used to manage queue)

### Building from source

1. Clone repository
  ```
  git clone https://github.com/ayanamitech/ethereum-faucet
  ```
2. Copy `config.json.example` to `config.json`
  ```
  cp config.json.example config.json
  ```
3. Update config.json `./config.json` (see config.json with placeholders below)
4. Install dependencies `npm install` from the project's root
5. Run faucet with `npm start`. Ethereum faucet will be launched at `http://localhost:5000`

### Server config.json (`./config.json`) with placeholders
```json
{
  "debug": "switch on/off debug logs: true or false",
  "error": "switch on/off error logs: true or false",
  "static": "serve static assets under ./public directory from express: true or false",
  "limitRequest": "Will restrict faucet claim requests from users when they make another requests in 24 hours: true or false",
  "retryMax": "Retry remote function calls for this amount after temporary failure",
  "retrySec": "Retry remote function calls after this amount of seconds",
  "rpc": "Web3 node for sending transactions, could be either public node (like infura) or localhost node",
  "redis": "Redis url, default to redis://127.0.0.1:6379 if redis is installed at the same server that faucet is running from",
  "privateKey": "Private key of Faucet account, must have enough Testnet Ether to disperse",
  "EtherToTransfer": "The number of Ether to be sent from the faucet. For example, '0.1' (should be string only)",
  "captcha": "Boolean to enable captcha for users",
  "captcha_type": "switcher between supported captcha solutions, hCaptcha is recommended (gCaptcha supported as well)",
  "captcha_siteKey": "site key for either hCaptcha or gCaptcha",
  "captcha_secret": "secret key value for hCaptcha or gCaptcha",
  "netName": "Network Name to display, default to Sokol POA Network",
  "netSymbol": "Network Symbol to display, default to SPOA",
  "blockTime": "Average network block time in seconds, will be used to refresh balance, refresh block number, etc",
  "confirmations": "Amount of transaction confirmation to complete the queue job",
  "explorer": "Blockchain explorer, https://blockscout.com/poa/sokol as a default",
  "publicRpc": "Public RPC address to display, https://sokol.poa.network as a default",
  "footer": "Footer text value for frontend",
  "twitter": "Link to Twitter for frontend",
  "homepage": "Link to homepage for frontend",
  "telegram": "Link to telegram profile or group for frontend",
  "github": "Link to Github for frontend",
  "eip1559": "Enable EIP-1559 transactions for payout"
}
```

### TO-DO

+ Improve privacy, encrypt redis key value
+ Telegram Authentication support
+ Improve logger
+ Improve NodeManager, collect statistics & health score for nodes
