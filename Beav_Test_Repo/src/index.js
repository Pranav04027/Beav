const calculator = require('./calculator');
const strings = require('./strings');
const arrays = require('./arrays');

module.exports = {
  ...calculator,
  ...strings,
  ...arrays,
};
