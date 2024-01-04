# Apicurio

> **The Apicurio extention has been deprecated in favor of [Apicurio registry explorer](https://marketplace.visualstudio.com/items?itemName=apicurio.apicurio-registry-explorer).**
> Thanks to the Apicurio organisation for the integration of this extention.

[Current Version][marketplace]
 [GitHub tag (latest SemVer)][github]
[license][MIT]

![Apicurio](/resources/apicurio_icon.png)

Explore any [Apicurio registry V2](https://www.apicur.io/registry/) with ease on your IDE.

## Features

![Apicurio](/resources/apicurio-explorer.png)

### Explore registry

- [X] Explore groups
- [X] Explore artifacts by ID or Names (see settings)
- [X] Search artifacts
- [X] Explore artifacts versions
- [X] Explore artifacts metas
- [X] Preview artifacts versions on your IDE
- [X] Preview OPENAPI with swaggerPreview (using [swagger-viewer](https://marketplace.visualstudio.com/items?itemName=Arjun.swagger-viewer) if available)

![Apicurio](/resources/gif/preview-artifact.gif)

### Content Edition

- [X] Add new artifacts
- [X] Add artifact versions
- [X] Edit artifacts versions metas
- [X] Edit artefacts versions state
- [X] Delete artifacts

![Apicurio](/resources/gif/add-artifact.gif)

![Apicurio](/resources/gif/edit-metas.gif)

## Installation

### Extension Marketplace

This extension is published in the [VSCode marketplace][marketplace].

1. Run [Install Extensions][Install Extensions] from the [Command Palette][Command Palette]
2. Search and choose  .

Also available on [open-vsx.org][openvsx].

## Settings

- `apicurio.http.secure` : Acces to Apicurio registry API over http or https.
- `apicurio.http.host` : Apicurio registry host.
- `apicurio.http.path` : Apicurio registry path.
- `apicurio.http.port` : Apicurio registry port.
- `apicurio.search.limit` : Custom search limit (increase Apicurio default).
- `apicurio.explorer.name` : Display name (if exist) instead of ID in registry explorer view.
- `apicurio.versions.reverse` : Reverse Versions order by default.
- `apicurio.tools.preview.format` : Format document on preview.
- `apicurio.tools.preview.OPENAPI` : Use or not Swagger-preview if [swagger-viewer](https://marketplace.visualstudio.com/items?itemName=Arjun.swagger-viewer) plugin is available for OPENAPI.

## Using multiples registries

If you use differents registries on different projects, use Workspace settings to override defaults.
You car use the the `Settings` > `Workspace` > `Apicurio` pannel or create a `.vscode/setttings.json` file.

## Release Notes

See [Changelog][Changelog].

## Known Issues

[GitHub issues][issues]

Feel free to report any [issues][new issue].

## Related Projects

See [apicurio.io](https://www.apicur.io/)

## License

[MIT][MIT]

## Contribute

Contributions welcome.

[humans txt][humanstxt]

[github]: https://github.com/jetmartin/apicurio
[issues]: https://github.com/jetmartin/apicurio/issues
[new issue]: https://github.com/jetmartin/apicurio/issues/new
[Changelog]: https://github.com/jetmartin/apicurio/blob/main/CHANGELOG.md
[humanstxt]: https://github.com/jetmartin/apicurio/blob/main/humans.txt
[MIT]: https://jet-martin.mit-license.org/2022
[humanstxt]: https://github.com/jetmartin/apicurio/blob/main/humans.txt
[marketplace]: https://marketplace.visualstudio.com/items?itemName=jetmartin.apicurio
[openvsx]: https://open-vsx.org/extension/jetmartin/apicurio
[command palette]: https://code.visualstudio.com/Docs/editor/codebasics#_command-palette
[install extensions]: https://code.visualstudio.com/docs/editor/extension-gallery#_install-an-extension
