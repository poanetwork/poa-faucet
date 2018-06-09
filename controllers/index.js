module.exports = function (app) {
	var EthereumTx = app.EthereumTx;
	var generateErrorResponse = app.generateErrorResponse;
	var config = app.config;
	var configureWeb3 = app.configureWeb3;
	var validateCaptcha = app.validateCaptcha;

	app.post('/', async function(request, response) {
		console.log("REQUEST:")
		console.log(request.body)
		var recaptureResponse = request.body["g-recaptcha-response"];
		//console.log("recaptureResponse: ", recaptureResponse)
		if (!recaptureResponse) return generateErrorResponse(response, {code: 500, title: "Error", message: "Invalid captcha"});

		var receiver = request.body.receiver;
		let out;
		try {
			out = await validateCaptcha(recaptureResponse);
		} catch(e) {
			return generateErrorResponse(response, e);
		}
		await validateCaptchaResponse(out, receiver, response);
	});

	app.get('/health', async function(request, response) {
		let web3;
		try {
			web3 = await configureWeb3(config);
		} catch(e) {
			return generateErrorResponse(response, e);
		}
		let resp = {};
		resp.address = config.Ethereum[config.environment].account;
		let balanceInWei = await web3.eth.getBalance(resp.address);
		let balanceInEth = await web3.utils.fromWei(balanceInWei, "ether");
		resp.balanceInWei = balanceInWei;
		resp.balanceInEth = Math.round(balanceInEth);
		response.send(resp);
	});

	async function validateCaptchaResponse(out, receiver, response) {
		if (!out) return generateErrorResponse(response, {code: 500, title: "Error", message: "Invalid captcha"});
		if (!out.success) return generateErrorResponse(response, {code: 500, title: "Error", message: "Invalid captcha"});

		let web3;
		try {
			web3 = await configureWeb3(config);
		} catch(e) {
			return generateErrorResponse(response, e);
		}
		await sendPOAToRecipient(web3, receiver, response);
	}

	async function sendPOAToRecipient(web3, receiver, response) {
		let senderPrivateKey = config.Ethereum[config.environment].privateKey;
		const privateKeyHex = Buffer.from(senderPrivateKey, 'hex')
		if (!web3.utils.isAddress(receiver)) return generateErrorResponse(response, {code: 500, title: "Error", message: "invalid address"});
		
		const gasPrice = web3.utils.toWei('1', 'gwei')
		let gasPriceHex = web3.utils.toHex(gasPrice);
		let gasLimitHex = web3.utils.toHex(config.Ethereum.gasLimit);
		let nonce = await web3.eth.getTransactionCount(config.Ethereum[config.environment].account);
		let nonceHex = web3.utils.toHex(nonce);
		let BN = web3.utils.BN;
		let ethToSend = web3.utils.toWei(new BN(config.Ethereum.milliEtherToTransfer), "milliether");
		const rawTx = {
		  nonce: nonceHex,
		  gasPrice: gasPriceHex,
		  gasLimit: gasLimitHex,
		  to: receiver, 
		  value: ethToSend,
		  data: '0x00'
		};

		let tx = new EthereumTx(rawTx);
		tx.sign(privateKeyHex);

		let serializedTx = tx.serialize();

		let txHash;
		web3.eth.sendSignedTransaction("0x" + serializedTx.toString('hex'))
		.on('transactionHash', (_txHash) => {
			txHash = _txHash;
		})
		.on('receipt', (receipt) => {
			console.log(receipt);
			if (receipt.status == '0x1') {
				return sendRawTransactionResponse(txHash, response);
			} else {
				let err = {code: 500, message: 'Transaction is mined, but status is false'};
				return generateErrorResponse(response, err);
			}
		})
		.on('error', (err) => {
			return generateErrorResponse(response, err);
		});
	}

	function sendRawTransactionResponse(txHash, response) {
		var successResponse = {
			code: 200, 
			title: "Success", 
			message: "Tx is mined",
			txHash: txHash
		};
	  	
	  	response.send({ success: successResponse });
	}
}
