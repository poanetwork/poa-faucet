module.exports = function (app) {
  app.debug = debug;

  function debug(text) {
    if (app.config.debug)
      console.log(text);
  }
}