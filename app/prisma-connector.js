const getContextManager = require("./context-manager");

const contextManager = getContextManager();
const validationActions = [
  "findFirst",
  "findMany",
  "findFirst",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
];
const createActions = ["create", "createMany", "upsert"];
const WHERE_CLAUSE = "where";

function addMultitenancy(
  parameters,
  next,
  prisma,
  accountIdColumnName = "account_id",
) {
  if (shouldValidateMultitenancy(parameters, accountIdColumnName, prisma)) {
    if (validationActions.includes(parameters.action)) {
      addQueryMultitenancy(parameters, accountIdColumnName);
    } else if (createActions.includes(parameters.action)) {
      addCreateMultitenancy(parameters, accountIdColumnName);
    }
  }

  return next(parameters);
}

function shouldValidateMultitenancy(parameters, columnName, prisma) {
  if (params.args?.ignoreMultitenancy !== undefined) {
    const status = params.args.ignoreMultitenancy;
    delete params.args.ignoreMultitenancy;

    return status;
  }
  return isColumnExists(params, columnName, prisma);
}

function isColumnExists(parameters, columnName, prisma) {
  const modelName = parameters.model;
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

function addCreateMultitenancy(parameters, accountIdColumnName) {
  if (!parameters.args) {
    parameters.args = {};
  }

  if (!parameters.args.data) {
    parameters.args.data = {};
  }

  parameters.args.data[accountIdColumnName] = getAccountId();
}

function addQueryMultitenancy(parameters, accountIdColumnName) {
  let query = {};

  if (!parameters.args) {
    parameters.args = {};
  }

  if (parameters.args.where) {
    query = parameters.args[WHERE_CLAUSE];
  }

  query[accountIdColumnName] = getAccountId();
  parameters.args[WHERE_CLAUSE] = query;
}

function getAccountId() {
  const store = contextManager.getStore();

  return store.accountId ? parseInt(store.accountId) : -1;
}

module.exports = { addMultitenancy, isColumnExists };
