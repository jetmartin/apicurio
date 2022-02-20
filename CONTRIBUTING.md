# Contributing

When contributing to this repository, please first discuss the change you wish to make via issue or any other method with the owners of this repository before making a change.

Please note that this project is maintain on free personal time, be kind and do not except immediate answers.

## install

```sh
npm i
```

## Developp

Use the run and debug pannel to test your module (For more details see [MSFT documentation](https://code.visualstudio.com/api)).
The launch Extention task will compile in watch mode your extention `npm run watch` and launch a vsc instance with current extention.
Use the `restart` button to refresh the VSC instance with current code.

You can run a local Apicurio registry available on http://localhost:8080 by running :

```sh
docker run -it -p 8080:8080 apicurio/apicurio-registry-mem:2.0.2.Final
```

## Lint your code

To lint you Extention code run :

```sh
npm run lint
```

## Package your code

Using VSCE Run :

```sh
vsce package
```
