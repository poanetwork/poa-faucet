module.exports = function (app) {
	var fs = app.fs;

	app.getConfig = getConfig;
	
  	function getConfig(cb) {
		var config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
		cb(config);
	}
}