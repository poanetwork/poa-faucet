function getTxCallBack(txHash, cb) {
	var inputData = {txHash: txHash};
	$.ajax({
	  	url:"/getTxCallBack",
	  	type:"POST",
	  	data:JSON.stringify(inputData),
	  	contentType:"application/json; charset=utf-8",
	  	dataType:"json"
	}).done(function(data) {
		if (data.code != 200) {
			setTimeout(function() {
		        getTxCallBack(txHash, cb);
		    }, 2000);
		    return;
		}
		cb();
	}).fail(function(err) {
		console.log(err);
		setTimeout(function() {
	        getTxCallBack(txHash, cb);
	    }, 2000);
	});
}
