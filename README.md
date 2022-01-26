# Node multi tenancy package

## TL;DR

This package adds the ability of multi-tenancy in a shared database strategy.
This package supports the full cycle of the request from extracting the tenant id, storing it and using it in any CRUD operation to the database.
This version only works with [Express](https://expressjs.com/) and [Prisma orm](https://www.prisma.io/).

---

## Background

There are multiple ways of achieving multi tenancy, starting from DB per tenant, scheme per tenant and one db for all tenants. All of them share the idea of having one instance (or a cluster) of the application to serve multiple tenants (also known as accounts or clients).

This package provides support for one DB for all tenants approach (shared database approach).
The idea behind it is very simple, all tables (actually most) hold an extra column which contains the tenant id. Every database access (CRUD operation), we need to specify the tenant which we want to address. For example if we want to read all the posts the following query will retrieve all accounts bank account transactions:

`SELECT * FROM Transactions`

The proper query is:

`SELECT * FROM Transactions WHERE account_id = 7`

Our problem begins with humans. It turns out humans tend to make mistakes, and in our case a mistake can be fatal.
Think of a case where a developer forgot to add the where clause, this means, one client will be able to view all the other clients bank account transactions. It is almost as if your database has been hacked.
Therefore, we can't trust developers as it turns out they are human after all and mistakes happen.

This package will take responsibility out of the developer's hands and will automatically add or edit the `where` clause with the proper tenant id.

The developers experience will be seamless, as from their perspective this app has only one client.

## Getting the tenant id

---

The first thing we need to do on any incoming request is to extract the tenant id from the request.

There are a lot of ways of doing that and each has its own pros and cons. The critical thing about it, is that from a security point of view, this is a critical point. If you choose a way that one might be able to manipulate he will be able to obtain data of any other client.

Another critical point is that we need to retrieve it on any incoming message, therefore we are using an Express middleware to do that.
Here are some examples:

1. Store the tenant id inside the JWT.
2. Retrieve it from your database (performance issues).
3. Expect to have it in the request headers (not very secure).

There are a lot of other ways.

When using this package middleware you can provide your own method of extracting the tenant id, if you won't provide any, we will use our default one which right now is getting it from an header (in the next version the default will be extracting it from the JWT).

## Storing the tenant id

---

Once we have the tenant id, we need to store it in a way each request will have its own tenant id, and we don't need to worry that async operations will interfere with each other. For that we are utilizing Async Local Storage. You don't need to do anything here, just an FYI section.

## Validating database operations

---

Now we need to make sure all database operations have a where clause and the proper tenant id, we are doing it by adding a Prisma middleware which validates that all operations have the proper tenant id.
This middleware assumes your tenant id column called `account_id`, however, you can override it. It only validates multi-tenancy if the table has the tenant id column in the requested model.

There is a way to override the multitenancy validation on specific queries by adding the `ignoreMultitenancy` flag to the Prisma query. In future versions any use of this flag will be logged.

In future versions we will also support blocks ignore in which we will ignore the validation for multiple queries.

# Quick start

1. Add the express middleware:

```
import { getMultitenancyMiddleware } from 'node-express-multitenant';

const app = express();

app.use(getMultitenancyMiddleware());
```

This middleware also accepts a function that returns the account id. That function accepts the request as a parameter. If it is not provided, the default extractor will be used. Here is an example of the extractor function:

```
function defaultAccountIdExtractor(req) {
  return req.headers['account-id'];
}
```

2. Add the Prisma middleware:

```
prisma = new PrismaClient();

prisma.$use((params, next) => {
    return addMultitenancy(params, next, prisma, 'account_id');
});
```

The last parameter is the tables tenant id column name, if not provided, `account_id` will be used.
