const getMultitenancyMiddleware = require('./express-middleware');
const { addMultitenancy, isColumnExists } = require('./prisma-connector');

module.exports = { getMultitenancyMiddleware, addMultitenancy, isColumnExists };
