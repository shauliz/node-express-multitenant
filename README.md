# Node Multi Tenancy Library

## TL;DR

This library adds support for multi-tenancy in a shared database strategy.
This library supports the full cycle of the request, from extracting the tenant ID, storing it, and using it in any CRUD operation to the database.
It only works with [Express](https://expressjs.com/) and [Prisma ORM](https://www.prisma.io/).
The library automatically adds or edits the `where` clause with the proper tenant ID on each database access.

---

## Background

There are multiple ways of achieving multi tenancy, starting from DB per tenant, scheme per tenant and one db for all tenants.
All of them share the idea of having one instance (or a cluster) of the application to serve multiple tenants (also known as accounts or clients).

This library provides support of one DB for all tenants approach (shared database approach).
The idea behind it is very simple. all tables (actually most) hold an extra column which contains the tenant ID. On every database access (CRUD operation), we need to specify the tenant which we want to address.
For example if we want to read all the posts, the following query will retrieve all accounts bank account transactions:

`SELECT * FROM Transactions`

The proper query is:

`SELECT * FROM Transactions WHERE account_id = 7`

Our problem begins with humans - it turns out humans tend to make mistakes, and in our case a mistake can have serious implications.
Think of a case where a developer forgets to add the `where` clause. This means that one client will be able to view all the other clients bank account transactions.
It is almost as if your database has been hacked.
Therefore, we can't trust developers, as it turns out they are human after all, and mistakes happen.

This library will take responsibility out of the developer's hands and will automatically add or edit the `where` clause with the proper tenant ID.

The developers experience will be seamless, as from their perspective this app has only one client.
A developer can explicitly override the multi-tenancy validation using the library's override option.

## Getting the Tenant ID

---

The first thing we need to do on any incoming request is to extract the tenant ID from the request.

There are many ways of doing that, and each has its own pros and cons.
The critical thing is that from a security point of view, this is a critical point.
If you choose a way that one might be able to manipulate, they will be able to obtain data of any other client.

Another important point is that we need to retrieve it on any incoming message, therefore we are using an Express middleware to do so.
Here are some examples:

1. Store the tenant ID inside the JWT
2. Retrieve it from your database (performance issues)
3. Expect to have it in the request headers (not very secured)

And there are many other ways.

When using this library middleware, a developer can provide their own method of extracting the tenant ID.
If they don't provide any, a default one will be used, which right now it is getting it from a header (in the next version, the default will be extracting it from a JWT).

## Storing the Tenant ID

Once we have the tenant ID, we need to store it in a way each request will have its own tenant ID, and we don't need to worry that async operations will interfere with each other.
For that we are utilizing Async Local Storage. You don't need to do anything here, just an FYI section.

## Validating Database Operations

---

Now we need to make sure all database operations have a where clause and the proper tenant ID, we are doing it by adding a Prisma middleware which validates that all operations have the proper tenant ID.
This middleware assumes your tenant ID column called `account_id`, however, you can change it. It only validates multi-tenancy if the table has the tenant ID column in the requested model.
If the table doesn't have the tenant ID column in it, we will skip the multitenancy validation.

There is a way of overriding the multitenancy validation on specific queries by adding the `ignoreMultitenancy` flag to the Prisma query.
In future versions any use of this flag will be logged.

In future versions we will also support blocks ignore, in which we'll ignore the validation for multiple queries.

# Quick Start

1. Add the express middleware:

```ts
import { getMultitenancyMiddleware } from "node-express-multitenant";

const app = express();

app.use(getMultitenancyMiddleware());
```

This middleware also accepts a function that returns the account ID. That function accepts the request as a parameter.
If it's not provided, the default extractor will be used. Here is an example of an extractor function:

```ts
function defaultAccountIdExtractor(req) {
  return req.headers["account-id"];
}
```

2. Add the Prisma Middleware:

```ts
const prisma = new PrismaClient();

prisma.$use((params, next) => {
  return addMultitenancy(params, next, prisma, "account_id");
});
```

The last parameter is the tables tenant ID column name. if not provided, `account_id` will be used.

Sending a query without multitenancy validation requires adding an `ignoreMultitenancy` flag:

```ts
const user = await prisma.user.findMany({
  where: {
    // some conditions
  },
  ignoreMultitenancy: true,
});
```

Feel free to contact me:

[Twitter](https://twitter.com/Shaul_Zuarets)

[Linkedin](https://www.linkedin.com/in/shaul-zuarets-1a789918/)
