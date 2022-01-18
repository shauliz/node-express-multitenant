# Node multi tenancy package

There multiple ways of achieving multi tenancy, starting from DB per tenant, scheme per tenant and on db for all tenants. All of the share the idea of having one instance of the application to serve multiple tenants (also known as accounts or clients).

This package aim is to support one DB for all tenants.
The idea behind this is very simple, all tables (actually most) holds an extra column which contains the tenant id. Every database access, we need to specify the tenant which we want to address.
