# APICURIO - Roadmap

This document describes the current status and the upcoming milestones of the Apicurio project.

## Summary

### Improvments

* Manage pagination in Apicurio search request.
* Manage keycloack authentification methods. (See impacts if multiples registries using workspace settings)
* Fix preview issue on Localhost (tested and functional on production registry).
* Fix preview type issue (do not use preview if type is not openapi).

### Features

* C(R)UD actions
  * Edit/replace artifact version
* Manage rules
* Manage Admin features

Any other relevant improvments, current features have been set regarding to devOps & squad teams priorities on operational delivery.

Contributions are welcome !

## Details

### Manage pagination in Apicurio search request

Apicurio search limit default is 20 items, now avaiable as module config.
Short therm improvment would be to allow pagination on the `apicurioExplorer` view.
Notice, pagination is require to explore "groups" but also artifacts within a group (even with dedicated route instread of search).

As there is no api to retrive groups only, this will definitely limit usage on large registries contents.
