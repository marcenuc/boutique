# Boutique — The boutique manager

This is a couchapp built for the management of tailor's shops.

It will allow to:

* insert the orders of the clients;
* insert the modifications requested by the clients;
* assign the work to the laboratories;
* track the warehouse.

# Development

To start development, install [`npm`][npm] and run

    ./bootstrap.sh

from the root of the project (no need to be the root user).

To upgrade a deployed instance (for tests), install [Maven][maven] and run:

    ./upgrade.sh [restart]

Without restart option, it will try to restart the boutique-webserver service. Passing a `0` it will only upgrade boutique and it's dependencies without restarting the service. Please note that restart is NOT needed most of the time; you need it ONLY if you change webserver configuration.

You can get a list of all available commands with:

    ./jake -T

Install [`jake`][jake] globally to avoid the `./` (follow instructions on [jake site][jake]).

[npm]: http://npmjs.org/
[maven]: http://maven.apache.org/
[jake]: https://github.com/mde/jake
