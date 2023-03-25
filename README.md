
<p align="center">
  <img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>


# Homebridge P1 Monitor

This plugin REQUIRES an existing P1-Monitor running ZTATZ P1-Monitor software. It consumes the API to bridge consumption (huidig verbruik) and delivery (huidige levering) to Homebridge via Ambient Light Level sensors.

_**NOTE:** You will need P1 Monitor software and exposed via API: (Dutch: https://www.ztatz.nl/p1-monitor/)_

Otherwise consider using plugin: https://github.com/ebaauw/homebridge-p1, this plugin taps directly into the serial-bus on your Homebridge for P1 communication.

## Setup Development Environment

To develop Homebridge plugins you must have Node.js 14.18.1 or later installed, and a modern code editor such as [VS Code](https://code.visualstudio.com/). This plugin template uses [TypeScript](https://www.typescriptlang.org/) to make development easier and comes with pre-configured settings for [VS Code](https://code.visualstudio.com/) and ESLint. If you are using VS Code install these extensions:
* [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

## Install Development Dependencies and Run Locally

Using a terminal, navigate to the project folder and run this command to install the development dependencies:

```
npm install
```

TypeScript needs to be compiled into JavaScript before it can run. The following command will compile the contents of your [`src`](./src) directory and put the resulting code into the `dist` folder.

```
npm run build
```

Run this command so your global install of Homebridge can discover the plugin in your development environment:

```
npm link
```

You can now start Homebridge, use the `-D` flag so you can see debug log messages in your plugin:

```
homebridge -D
```

At this point the plugin should show up in your local Homebridge setup.

## Publish Package

```
npm publish
```

_NOTE: When you are ready to publish your plugin to [npm](https://www.npmjs.com/), make sure you have removed the `private` attribute from the [`package.json`](./package.json)_

If you are publishing a scoped plugin, i.e. `@username/homebridge-xxx` you will need to add `--access=public` to command the first time you publish.

**Publishing Beta Versions**

```bash
npm version prepatch --preid beta
npm publish --tag=beta
```

_NOTE: Users can then install the  *beta* version by appending `@beta` to the install command_
