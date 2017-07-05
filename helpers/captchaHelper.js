module.exports = function (app) {
	var config = app.config;
	var generateErrorResponse = app.generateErrorResponse;
	var debug = app.debug;
	var querystring = app.querystring;
	var https = app.https;

	app.validateCaptcha = validateCaptcha;
 
	function validateCaptcha(captchaResponse, cb) {
	    var secret = config.Captcha.secret;
	    var post_data_json = {
	      "secret": secret,
	      "response": captchaResponse
	    }

	    var post_data = querystring.stringify(post_data_json);

	    debug(post_data_json);
	    debug(post_data);

	    // An object of options to indicate where to post to
	    var post_options = {
	        host: "www.google.com",
	        port: '443',
	        path: "/recaptcha/api/siteverify",
	        method: 'POST',
	        headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
	    };

	    debug(post_options);

	    var post_req = https.request(post_options, function (res) {
	        res.setEncoding('utf8');
	        var output = "";
	        res.on('data', function (chunk) {
	          output += chunk;
	        });

	        res.on('end', function () {
	            debug("##############");
	            debug('Output from validateCaptcha: ');
	            debug(output);
	            debug("##############");
	            if (output) {
	              debug(JSON.parse(output));
	              cb(null, JSON.parse(output));
	            } else {
	              cb();
	            }
	        });
	    });

	    post_req.on('error', function (err) {
	        debug(err);
	        cb(err);
	    });
	    // post the data
	    post_req.write(post_data, 'binary', function(e) {
	      if (e) debug(e);
	    });
	    post_req.end();
	};
}