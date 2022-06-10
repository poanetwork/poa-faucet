let captchaResponse;
let config;
let health;
let resultInterval;
let resultCache;
let ifFailed = null;

const web3 = new Web3();
BigNumber.config({ EXPONENTIAL_AT: 1e+9 });

const decimalToHexString = (number) => {
  if (number < 0) {
    number = 0xFFFFFFFF + number + 1;
  }

  return `0x${number.toString(16)}`;
}

/** Remove Decimal without rounding with BigNumber */
const rmDecimalBN = (bigNum, decimals = 6) => new BigNumber(bigNum).times(BigNumber(10).pow(decimals)).integerValue(BigNumber.ROUND_DOWN).div(BigNumber(10).pow(decimals)).toNumber();

/**
  Ignore thrown Error so that setInterval wouldn't break
**/
const ignoreError = (func) => {
  try {
    func();
  } catch (e) {
    console.error(e);
  }
};

const axiosOptions = {
  retryMax: 0
}

const polipop = new Polipop('faucet', {
	position: 'bottom-right',
	insert: 'after',
	life: 5000,
	progressbar: true,
	effect: 'slide'
});

const loadCaptcha = () => {
	switch (config.captchaType) {
		case 'reCaptcha': {
			grecaptcha.ready(() => {
				grecaptcha.render('captcha_container', {
					'sitekey': config.siteKey
				});
			});
			break;
		}
		case 'hCaptcha': {
			hcaptcha.render('captcha_container', {
				'sitekey': config.siteKey
			});
			break;
		}
		default: {
			console.log('No captcha defined!');
		}
	}
}

const showReconnected = () => {
  if (ifFailed === null) {
    return;
  }
  polipop.add({
    type: 'success',
    title: 'Success',
    content: 'Server reconnected'
  });
  ifFailed = null;
}

const fetchHealth = async () => {
	try {
		const serverHealth = await axios.get('/health', axiosOptions);
    if (!serverHealth || serverHealth.blockNumber === 0) {
      throw new Error('Block number is zero');
    }
    health = serverHealth;
    if (config === undefined) {
      const serverConfig = await axios.get('/config', axiosOptions);
      if (!serverConfig || serverConfig.chainId === 0) {
        throw new Error('Invalid config data');
      }
      config = serverConfig;
    }
		const block_link = config.explorer + '/block/' + health.blockNumber;
		$("span#blockNumber").text(`${health.blockNumber}`);
		$("span#faucet-balance").text(`${rmDecimalBN(health.balanceInEth)} ${config.netSymbol}`);
		$("span#ethSpent").text(`${rmDecimalBN(health.ethSpent)} ${config.netSymbol}`);
		$("a#block-number").attr('href', `${block_link}`);
    showReconnected();
	} catch (e) {
		console.error('Failed to fetch resources from /health');
		console.error(e);
    ifFailed = true;
		polipop.add({
			type: 'error',
			title: 'Error',
			content: 'Could not connect to faucet server'
		});
		throw e;
	}
}

const updateStatic = async () => {
	try {
		const loader = $(".loading-container");
		loader.removeClass("hidden");
		await fetchHealth();
		const faucet_account = config.explorer + '/address/' + config.faucetAddress;
    $('html head').find('title').text(`${config.netName} Faucet`);
		$("#requestTokens").text(`Request ${config.ethPerUser} ${config.netSymbol}`);
		$("#faucet-rpc").text(`${config.publicRpc}`);
		$("#faucet-network").text(`${config.netName}`);
		$("a#header-explorer").attr('href', `${config.explorer}`);
		$("a#faucet-account").attr('href', `${faucet_account}`);
    if (config.footer) $(".rights").text(`${config.footer}`);
    if (config.twitter) $("a.social_twitter").attr('href', `${config.twitter}`);
    if (config.homepage) $("a.social_oracles").attr('href', `${config.homepage}`);
    if (config.telegram) $("a.social_telegram").attr('href', `${config.telegram}`);
    if (config.github) $("a.social_github").attr('href', `${config.github}`);
    if (config.telegram_bot === true) {
      $('button#registerTelegram').removeClass('hidden').addClass('request-tokens-button-link').attr('onclick', `window.open('${config.telegram}','_blank');`);
    }
		loadCaptcha();
		loader.addClass("hidden");
	} catch (error) {
		loader.addClass("hidden");
		throw new Error('Could not connect to faucet server');
	}
}

const checkInputAddress = () => {
	const receiver = $("#receiver").val();
	if (!receiver || !web3.utils.isAddress(receiver)) {
		console.error(`Invalid Address ${receiver}`);
		polipop.add({
			type: 'error',
			title: 'Error',
			content: `Invalid Address ${receiver}`
		});
		return;
	}
	return web3.utils.toChecksumAddress(receiver);
}

const checkAddress = async () => {
  try {
    const receiver = $("#receiver").val();
    const result = await axios.get(`/query/${receiver}`, axiosOptions);
    if (!result || result.message !== 'Eligible Address') {
      throw new Error('Not Eligible Address');
    }
    return true;
  } catch (e) {
    console.error(`Address ${receiver} not eligible`);
    polipop.add({
			type: 'error',
			title: 'Error',
			content: `You have already claimed once, please wait until you could reclaim again`
		});
    return false;
  }
}

const checkBot = async () => {
  if (config.telegram_bot !== true) {
    return true;
  }
  try {
    const receiver = $("#receiver").val();
    const result = await axios.get(`/bot/${receiver}`, axiosOptions);
    if (!result || result.message !== 'Eligible Address') {
      throw new Error('Not Eligible Address');
    }
    return true;
  } catch (e) {
    console.error(`Address ${receiver} not registered`);
    polipop.add({
			type: 'error',
			title: 'Error',
			content: `Address not registered from <a href="${config.telegram}" target="_blank">${config.telegram}</a>`
		});
    return false;
  }
}

const checkFaucetBalance = () => {
	const faucetAmount = new BigNumber(health.balanceInEth);
	const amountToGive = new BigNumber(config.ethPerUser);
	if (faucetAmount.times(2).lte(amountToGive)) {
		console.error('Low faucet balance');
		polipop.add({
			type: 'error',
			title: 'Error',
			content: 'Low faucet balance'
		});
		return;
	}
	return true;
}

const checkCaptchaResponse = () => {
	const formData = $("#faucetForm").serializeArray();
	if (config.captchaType !== null) {
		const name = (config.captchaType === 'hCaptcha') ? 'h-captcha-response' : 'g-recaptcha-response';
		const { value: captcha } = formData.find(d => d.name === name);
		if (!captcha || captcha === captchaResponse) {
			console.error('No captcha');
			polipop.add({
				type: 'error',
				title: 'Error',
				content: 'Please solve the captcha'
			});
			return false;
		}
		captchaResponse = captcha;
		return captcha;
	}
	return true;
}

const loadFormInput = (receiver, captcha) => {
	const params = new URLSearchParams();
	if (config.captchaType !== null) {
		const name = (config.captchaType === 'hCaptcha') ? 'h-captcha-response' : 'g-recaptcha-response';
		params.append('receiver', receiver);
		params.append(name, captcha);
		return params;
	}
	params.append('receiver', receiver);
	return params;
}

const resetCaptcha = () => {
	switch (config.captchaType) {
		case 'reCaptcha': {
			grecaptcha.reset();
		}
		case 'hCaptcha': {
			hcaptcha.reset();
		}
		default: {
			console.log('No captcha defined!');
		}
	}
}

const checkJobStatus = async (address) => {
  try {
    const result = await axios.get(`/job/${address}`, axiosOptions);
    if (!result) {
      throw new Error(`Invalid Job response from server ${result}`);
    }
    if (resultCache !== 'ACCEPTED' && result.message === 'ACCEPTED') {
      polipop.add({
				type: 'success',
				title: 'Success',
				content: 'Job queued from Faucet'
			});
      resultCache = 'ACCEPTED';
      return;
    }
    if (resultCache !== 'SENT' && result.message === 'SENT') {
      polipop.add({
				type: 'success',
				title: 'Success',
				content: 'Transaction sent from faucet'
			});
      resultCache = 'SENT';
      return;
    }
    if (resultCache !== 'MINED' && result.message === 'MINED') {
      polipop.add({
				type: 'success',
				title: 'Success',
				content: 'Transaction mined, please wait until confirmation'
			});
      resultCache = 'MINED';
      return;
    }
    if (resultCache !== 'CONFIRMED' && result.txid && result.message === 'CONFIRMED') {
      polipop.add({
				type: 'success',
				title: 'Success',
				content: `Transaction confirmed <a href="${config.explorer}/tx/${result.txid}" target="_blank">${config.explorer}/tx/${result.txid}</a>`
			});
      clearInterval(resultInterval);
      resultInterval = undefined;
      resultCache = 'CONFIRMED';
      return;
    }
    if (resultCache !== 'FINISHED' && result.txid === null && result.message === 'FINISHED') {
      polipop.add({
				type: 'success',
				title: 'Success',
				content: `Transaction confirmed`
			});
      clearInterval(resultInterval);
      resultInterval = undefined;
      resultCache = 'FINISHED';
      return;
    }
  } catch (e) {
    console.error('Error while checking job status');
    console.error(e);
    polipop.add({
      type: 'error',
      title: 'Error',
      content: `Error while checking job process, will reset the job please try again`
    });
    clearInterval(resultInterval);
    resultInterval = undefined;
    resultCache = undefined;
  }
}

const responseHandler = async (formInput) => {
	try {
		const result = await axios.post('/', formInput, axiosOptions);
    if (!result || result.message !== 'Job has been queued') {
      throw new Error(`Invalid response from server ${result}`);
    }
    polipop.add({
      type: 'success',
      title: 'Success',
      content: `Request submitted`
    });
    resultCache = undefined;
    resultInterval = setInterval(() => checkJobStatus(web3.utils.toChecksumAddress(result.address)), config.blockTime * 1000);
	} catch (e) {
		if (e.response?.data?.message === 'Invalid captcha') {
			console.error(e.response?.data);
			polipop.add({
				type: 'error',
				title: 'Error',
				content: 'Server could not validate Captcha!'
			});
			return;
		}
	}
}

const handleMetamask = async () => {
  try {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    $('input[name="receiver"]').val(`${accounts[0]}`);
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: decimalToHexString(config.chainId) }],
      });
      polipop.add({
        type: 'success',
        title: 'Success',
        content: 'Fetched account from Metamask'
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: decimalToHexString(config.chainId),
                chainName: `${config.netName}`,
                nativeCurrency: {
                  name: `${config.netName}`,
                  symbol: `${config.netSymbol}`,
                  decimals: 18
                },
                rpcUrls: [ `${config.publicRpc}` ],
                blockExplorerUrls: [ `${config.explorer}`]
              }
            ]
          });
          polipop.add({
            type: 'success',
            title: 'Success',
            content: `Network added`
          });
        } catch (addError) {
          console.error(`Could not add network ${addError}`);
          // handle "add" error
          polipop.add({
            type: 'error',
            title: 'Error',
            content: `Could not add network ${config.netName}`
          });
        }
      }
      // handle other "switch" errors
      console.error(`Could not change Metamask network ${switchError}`)
      polipop.add({
        type: 'error',
        title: 'Error',
        content: `Could not switch network ${config.netName}`
      });
    }
  } catch (e) {
    console.error(`Failed to connect Metamask: ${e}`);
    polipop.add({
      type: 'error',
      title: 'Error',
      content: 'Could not connect with Metamask'
    });
  }
}

const main = async () => {
	await updateStatic();
	// Update config from server for every 10 seconds
	setInterval(() => ignoreError(fetchHealth), config.blockTime * 1000);

	$("#metamask").click((e) => {
		e.preventDefault();
		e.stopImmediatePropagation();
		if (window.ethereum === undefined) {
      polipop.add({
				type: 'error',
				title: 'Error',
				content: 'Metamask not found!'
			});
      return;
    }
    handleMetamask();
	});

	$("#requestTokens").click(() => {
		$("#faucetForm").submit(async (e) => {
			e.preventDefault();
			e.stopImmediatePropagation();
			const receiverAddress = checkInputAddress(web3);
			if (!receiverAddress) {
				return;
			}
      const botUser = await checkBot();
      if (!botUser) {
        return;
      }
      const checkUser = await checkAddress();
      if (!checkUser) {
        return;
      }
			const checkFaucet = checkFaucetBalance();
			if (!checkFaucet) {
				return;
			}
			const checkCaptcha = checkCaptchaResponse();
			if (!checkCaptcha) {
				return;
			}
			const formInput = loadFormInput(receiverAddress, checkCaptcha);
			await responseHandler(formInput);
			resetCaptcha();
		});
	});
}

$(document).ready(main);
