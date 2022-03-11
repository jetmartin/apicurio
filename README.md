# Apicurio

[![Current Version](https://img.shields.io/visual-studio-marketplace/v/jetmartin.apicurio.svg?color=emerald&label=Visual%20Studio%20Marketplace&logo=visual-studio-code&logoColor=blue&style=flat)
![Install Count](https://img.shields.io/visual-studio-marketplace/i/jetmartin.apicurio.svg?color=emerald&style=flat)
![downloads Count](https://img.shields.io/visual-studio-marketplace/d/jetmartin.apicurio.svg?color=emerald&style=flat)][marketplace]
 [![GitHub tag (latest SemVer)](https://img.shields.io/github/tag/jetmartin/apicurio.svg?color=emerald&label=release&logoColor=white&logo=github&labelColor=grey)][github]
[![license](https://img.shields.io/badge/license-MIT-brightgreen.svg)][MIT]

Explore any [Apicurio registry V2](https://www.apicur.io/registry/) with ease on your IDE.

## Features

![Apicurio](/resources/apicurio_icon.png)

### Explore registry

- [x] Explore groups
- [x] Explore artifacts
- [x] Search artifacts
- [x] Explore artifacts versions
- [x] Explore artifacts metas
- [x] Preview artifacts versions on your IDE
- [x] Preview OPENAPI with swaggerPreview (using [swagger-viewer](https://marketplace.visualstudio.com/items?itemName=Arjun.swagger-viewer) if available)

### Content Edition

- [x] Add new artifacts
- [x] Add artifact versions
- [x] Edit artifacts versions metas
- [x] Edit artefacts state

## Installation

### Extension Marketplace

This extension is published in the [VSCode marketplace][marketplace].

 1. Run [Install Extensions] from the [Command Palette]
 1. Search and choose  [**`apicurio`**][marketplace].

Also available on [open-vsx.org][openvsx].

## Settings

- `apicurio.http.secure` : Acces to Apicurio registry API over http or https.
- `apicurio.http.host` : Apicurio registry host.
- `apicurio.http.path` : Apicurio registry path.
- `apicurio.http.port` : Apicurio registry port.
- `apicurio.search.limit` : Custom search limit (increase Apicurio default).
- `apicurio.versions.reverse` : Reverse Versions order by default.
- `apicurio.tools.preview.OPENAPI` : Use or not Swagger-preview if [swagger-viewer](https://marketplace.visualstudio.com/items?itemName=Arjun.swagger-viewer) plugin is available for OPENAPI.

## Using multiples registries

If you use differents registries on different projects, use Workspace settings to override defaults.
You car use the the `Settings` > `Workspace` > `Apicurio` pannel or create a `.vscode/setttings.json` file.

## Release Notes

See [Changelog].

## Known Issues

[![GitHub issues](https://img.shields.io/github/issues/jetmartin/apicurio.svg?color=tomato)][issues]

Feel free to report any [issues][new issue].

## Related Projects

See [apicurio.io](https://www.apicur.io/)

## License

[MIT]

## Contribute

Contributions welcome.

[humans txt][humanstxt]

[github]: <https://github.com/jetmartin/apicurio>
[issues]: <https://github.com/jetmartin/apicurio/issues>
[new issue]: <https://github.com/jetmartin/apicurio/issues/new>
[Changelog]: <https://github.com/jetmartin/apicurio/blob/main/CHANGELOG.md>
[humanstxt]: <https://github.com/jetmartin/apicurio/blob/main/humans.txt>
[MIT]: <https://jet-martin.mit-license.org/2022>
[humanstxt]: <https://github.com/jetmartin/apicurio/blob/main/humans.txt>
[marketplace]: <https://marketplace.visualstudio.com/items?itemName=jetmartin.apicurio>
[openvsx]: <https://open-vsx.org/extension/jetmartin/apicurio>
[command palette]: <https://code.visualstudio.com/Docs/editor/codebasics#_command-palette>
[install extensions]: <https://code.visualstudio.com/docs/editor/extension-gallery#_install-an-extension>
