const getContextManager = require('./context-manager');

const contextManager = getContextManager();
const validationActions = [
  'findFirst',
  'findMany',
  'findFirst',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
];
const createActions = ['create', 'createMany', 'upsert'];
const WHERE_CLAUSE = 'where';

function addMultitenancy(
  params,
  next,
  prisma,
  accountIdColumnName = 'account_id'
) {
  if (shouldValidateMultitenancy(params, accountIdColumnName, prisma)) {
    if (validationActions.includes(params.action)) {
      addQueryMultitenancy(params, accountIdColumnName);
    } else if (createActions.includes(params.action)) {
      addCreateMultitenancy(params, accountIdColumnName);
    }
  }
  return next(params);
}

function shouldValidateMultitenancy(params, columnName, prisma) {
  if (params.args?.ignoreMultitenancy) {
    delete params.args.ignoreMultitenancy;
    return false;
  }
  return isColumnExists(params, columnName, prisma);
}

function isColumnExists(params, columnName, prisma) {
  const modelName = params.model;
  const models = prisma._dmmf.datamodel.models;
  for (let i = 0; i < models.length; i++) {
    if (models[i].name === modelName) {
      for (let g = 0; g < models[i].fields.length; g++) {
        if (models[i].fields[g].name === columnName) {
          return true;
        }
      }
    }
  }

  return false;
}

function addCreateMultitenancy(params, accountIdColumnName) {
  if (!params.args) {
    params.args = {};
  }
  if (!params.args.data) {
    params.args.data = {};
  }
  params.args.data[accountIdColumnName] = getAccountId();
}

function addQueryMultitenancy(params, accountIdColumnName) {
  var query = {};

  if (!params.args) {
    params.args = {};
  }
  if (params.args.where) {
    query = params.args[WHERE_CLAUSE];
  }

  query[accountIdColumnName] = getAccountId();
  params.args[WHERE_CLAUSE] = query;
}

function getAccountId() {
  const store = contextManager.getStore();
  return store.accountId ? parseInt(store.accountId) : -1;
}

module.exports = { addMultitenancy, isColumnExists };
