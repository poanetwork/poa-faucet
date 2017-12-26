$(function() {
	var loader = $(".loading-container");
	//$( "#faucetForm" ).submit(function( e ) {
	$( "#requestTokens" ).click(function( e ) {
		e.preventDefault();
    	$this = $(this);
		loader.removeClass("hidden");
		var receiver = $("#receiver").val();
		$.ajax({
		  	url:"/",
		  	type:"POST",
		  	data: {//$this.serialize(),
		  		receiver: receiver
		  	}
		}).done(function(data) {
			if (!data.success) {
				loader.addClass("hidden");
				swal(data.error.title, data.error.message, "error");
				return;
			}

			getTxCallBack(data.success.txHash, function() {
				$("#receiver").val('');
				loader.addClass("hidden");
				swal("Success",
				  "0.5 ETH is successfully transfered to " + receiver + "</a>",
				  "success"
				);
				grecaptcha.reset();
			});
		}).fail(function(err) {
			console.log(err);
			loader.addClass("hidden");
		});
	});
});