
const logger = (req, res, next) => {
  console.log('Request received');
  next();
};

module.exports = { logger };
