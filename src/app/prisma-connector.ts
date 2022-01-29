import { getContextManager } from "app/context-manager";

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

// eslint-disable-next-line max-params
export function addMultitenancy(
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
  if (parameters.args?.ignoreMultitenancy !== undefined) {
    const status = parameters.args.ignoreMultitenancy;

    delete parameters.args.ignoreMultitenancy;

    if (status) {
      return false;
    }
  }

  return isColumnExists(parameters, columnName, prisma);
}

export function isColumnExists(parameters, columnName, prisma) {
  const modelName = parameters.model;
  // eslint-disable-next-line no-underscore-dangle
  const models = prisma._dmmf.datamodel.models;

  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    if (models[modelIndex].name === modelName) {
      for (
        let fieldIndex = 0;
        fieldIndex < models[modelIndex].fields.length;
        fieldIndex++
      ) {
        if (models[modelIndex].fields[fieldIndex].name === columnName) {
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
