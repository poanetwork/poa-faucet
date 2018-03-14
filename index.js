var express = require('express');
var fs = require('fs');
var https = require('https');
var bodyParser = require('body-parser');
var querystring = require('querystring');
var Web3 = require('web3');
var EthereumTx = require('ethereumjs-tx');
var app = express();

app.fs = fs;
app.https = https;
app.querystring = querystring;
app.Web3 = Web3;
app.EthereumTx = EthereumTx;

var config;
var configPath = './config.json';
var configExists = fs.existsSync(configPath, fs.F_OK);
if (configExists) config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
app.config = config;

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

require('./helpers/debug')(app);
require('./helpers/generateResponse')(app);
require('./helpers/configHelper')(app);
require('./helpers/blockchainHelper')(app);
require('./helpers/captchaHelper')(app);
require('./controllers/index')(app);

app.get('/', function(request, response) {
  response.send('Sokol POA Network faucet');
});

app.set('port', (process.env.PORT || 5000));

app.listen(app.get('port'), function () {
    console.log('Sokol testnet POA Network faucet is running on port', app.get('port'));
});

