import contextManager from "app/context-manager";

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

  return isTenantFieldExists(parameters, columnName, prisma);
}

export function isTenantFieldExists(parameters, fieldName, prisma) {
  const modelName = parameters.model;
  // eslint-disable-next-line no-underscore-dangle
  const models = prisma._dmmf.datamodel.models;

  const matchedModel = models.find((model) => model.name === modelName);

  if (!matchedModel) {
    return false;
  }

  const matchedField = matchedModel.fields.find(
    (field) => field.name === fieldName,
  );

  return !!matchedField;
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
