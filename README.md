# Node multi tenancy package

## TL;DR

This package automatically adds or edit the `where` clause in any CRUD operation with the proper tenant id.
This version only works with [Express](https://expressjs.com/) and [Prism orm](https://www.prisma.io/)

---

## Background

There multiple ways of achieving multi tenancy, starting from DB per tenant, scheme per tenant and one db for all tenants. All of the share the idea of having one instance (or a cluster) of the application to serve multiple tenants (also known as accounts or clients).

This package provide support for one DB for all tenants approach.
The idea behind this is very simple, all tables (actually most) holds an extra column which contains the tenant id. Every database access (CRUD operation), we need to specify the tenant which we want to address. For example if we want to read all the posts the following query will retrieve all accounts bank account transactions:

`SELECT * FROM Transactions`

The proper query is:

`SELECT * FROM Transactions WHERE account_id = 7`

Our problem begins with humans, it turns out humans tends to do mistakes, and in our case a mistake can be fatal.
Think of a case where a developer forget to add the where clause, this means, one client will be able to view all of the other clients bank account transactions. It is almost as your database has been hacked.
Therefore, we can't trust developers as it turns out they are human after all and mistakes happen.

This package will take responsibility out of the developer hands and will automatically add or edit the `where` clause with the proper tenant id.

The developers experience will be seamless, as from their perspective this app has only one client.

## Getting the tenant id

---

The first thing we need to do on any incoming request is to extract the tenant id from the request.

There are a lot of ways of doing that and each has it's own pros and cons. The critical thing about it, is that from security point of view, this is a critical point. If you choose a way that one might be able to manipulate he will be able to obtain data of any other client.

Another critical point is that we need to retrieve it on any incoming message, therefor we are using an Express middleware to do that.
Here are some examples:

1. Store the tenant id inside the JWT.
2. Retrieve it from your database (performance issues).
3. Expect to have it in the request headers (not very secure).

There are a lot of other ways.

When using this package middleware you can provide your own method of extracting the tenant id, if you won't provide any, we will use our default one which right now is getting it from an header (in the next version the default will be extracting it from the JWT).

## Storing the tenant id

---

Once we have the tenant id, we need to store it in a way each request will have its own tenant id and we don't need to be afraid async operation will interfere with each other. For this we are utilizing Async Local storage. You don't need to anything here, just for you to know it.
