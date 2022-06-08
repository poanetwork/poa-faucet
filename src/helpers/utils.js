const setDelay = (secs) => new Promise(resolve => setTimeout(() => resolve(), secs * 1000));

/**
  Ignore thrown Error so that interval wouldn't break
**/
const ignoreError = (func) => {
  try {
    func();
  } catch (e) {
    // Since we catch from functions that would throw Error for the first time only, will leave an empty error block here
  }
};

module.exports = {
  setDelay,
  ignoreError,
};
