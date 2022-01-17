const getMultitenancyMiddleware = require('./expressMiddleware');
const { addMultitenancy, isColumnExists } = require('./prismaConnector');

module.exports = { getMultitenancyMiddleware, addMultitenancy, isColumnExists };
