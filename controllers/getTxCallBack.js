module.exports = function (app) {
	var getTxCallBack = app.getTxCallBack;

	app.post('/getTxCallBack', function(request, response) {
		var txHash = request.body.txHash;
		getTxCallBack(txHash, response);
	});
}