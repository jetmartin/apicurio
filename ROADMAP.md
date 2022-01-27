# APICURIO - Roadmap

This document describes the current status and the upcoming milestones of the Apicurio project.

## Summary

### Improvments

* Manage pagination in Apicurio search request
* Display artifact version meta (currently only latest metas)
* Manage keycloack authentification methods.
* Fix preview issue on Localhost (tested and functional on production registry.)
* Display meta : labels
* Display meta : properties

### Features

* Manage multiples registries
* C(R)UD actions
  * Add new Artifact
  * Edit artifact
  * Delete artifact
  * Edit artifact metas
* Search group
* Search artifact
* Manage rules
* Manage Admin features

Any other relevant improvments, current features have been set regarding to devOps & squad teams priorities on operational delivery.

Contributions are welcome !

## Details

### Manage pagination in Apicurio search request

Apicurio search limit default is 20 items.
Short therm improvment would be to set the limit in module parameter amd/or allow pagination on the view.

May the `/groups/{groupId}/artifacts` route is more relevant for the artifact request (seems to not have a limit).

As there is no api to retrive groups only, this will definitely limit usage on large registries contents even with bellow improvments.
Some experiments would be done on the search `order by : name` feature (is that the name wich is not require, the id, group/id, ...) to look for improvments.
