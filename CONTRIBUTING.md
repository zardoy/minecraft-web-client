# Contributing Guide

After forking the repository, run the following commands to get started:

0. Ensure you have [Node.js](https://nodejs.org) installed. Enable corepack with `corepack enable` *(1).
1. Install dependencies: `pnpm i`
2. Start the project in development mode: `pnpm start` or build the project for production: `pnpm build`
3. Read the [Tasks Categories](#tasks-categories) and [Workflow](#workflow) sections below
4. Let us know if you are working on something and be sure to open a PR if you got any changes. Happy coding!

*(1): If you are getting `Cannot find matching keyid` update corepack to the latest version with `npm i -g corepack`.

*(2): If still something doesn't work ensure you have the right nodejs version with `node -v` (tested on 22.x)

<!-- *(3): For GitHub codespaces (cloud ide): Run `pnpm i @rsbuild/core@1.2.4 @rsbuild/plugin-node-polyfill@1.3.0 @rsbuild/plugin-react@1.1.0 @rsbuild/plugin-typed-css-modules@1.0.2` command to avoid crashes because of limited ram -->

## Project Structure

There are 3 main parts of the project:

### Core (`src`)

This is the main app source code which reuses all the other parts of the project.

> The first version used Webpack, then was migrated to Esbuild and now is using Rsbuild!

- Scripts:
  - Start: `pnpm start`, `pnpm dev-rsbuild` (if you don't need proxy server also running)
  - Build: `pnpm build` (note that `build` script builds only the core app, not the whole project!)

Paths:

- `src` - main app source code
- `src/react` - React components - almost all UI is in this folder. Almost every component has its base (reused in app and storybook) and `Provider` - which is a component that provides context to its children. Consider looking at DeathScreen component to see how it's used.

## Core-related

How different modules are used:

- `mineflayer` - provider `bot` variable and as mineflayer states it is a wrapper for the `node-minecraft-protocol` module and is used to connect and interact with real Java Minecraft servers. However not all events & properties are exposed and sometimes you have to use `bot._client.on('packet_name', data => ...)` to handle packets that are not handled via mineflayer API. Also you can use almost any mineflayer plugin.

## Running Main App + Playground

To start the main web app and playground, run `pnpm run-all`. Note is doesn't start storybook and tests.

## Cypress Tests (Browser Integration)

Cypress tests are located in `cypress` folder. To run them, run `pnpm test-mc-server` and then `pnpm test:cypress` when the `pnpm prod-start` is running (or change the port to 3000 to test with the dev server). Usually you don't need to run these until you get issues on the CI.

## Unit Tests

There are not many unit tests for now (which we are trying to improve).
Location of unit tests: `**/*.test.ts` files in `src` folder and `renderer` folder.
Start them with `pnpm test-unit`.

## Making protocol-related changes

You can get a description of packets for the latest protocol version from <https://wiki.vg/Protocol> and for previous protocol versions from <https://wiki.vg/Protocol_version_numbers> (look for *Page* links that have *Protocol* in URL).

Also there are [src/generatedClientPackets.ts](src/generatedClientPackets.ts) and [src/generatedServerPackets.ts](src/generatedServerPackets.ts) files that have definitions of packets that come from the server and the client respectively. These files are generated from the protocol files. Protocol, blocks info and other data go from <https://github.com/prismarineJS/minecraft-data> repository.

## A few other notes

- To link dependency locally e.g. flying-squid add this to `pnpm` > `overrides` of root package.json: `"flying-squid": "file:../space-squid",` (with some modules `pnpm link` also works)

- Press `Y` to reload application into the same world (server, local world or random singleplayer world)
- To start React profiling disable `REACT_APP_PROFILING` code first.
- It's recommended to use debugger for debugging. VSCode has a great debugger built-in. If debugger is slow, you can use `--no-sources` flag that would allow browser to speedup .map file parsing.
- Some data are cached between restarts. If you see something doesn't work after upgrading dependencies, try to clear the by simply removing the `dist` folder.
- The same folder `dist` is used for both development and production builds, so be careful when deploying the project.
- Use `start-prod` script to start the project in production mode after running the `build` script to build the project.
- If CI is failing on the next branch for some reason, feel free to use the latest commit for release branch. We will update the base branch asap. Please, always make sure to allow maintainers do changes when opening PRs.

## Tasks Categories

(most important for now are on top).

## 1. Client-side Logic (most important right now)

Everything related to the client side packets. Investigate issues when something goes wrong with some server. It's much easier to work on these types of tasks when you have experience in Java with Minecraft, a deep understanding of the original client, and know how to debug it (which is not hard actually). Right now the client is easily detectable by anti-cheat plugins, and the main goal is to fix it (mostly because of wrong physics implementation).

Priority tasks:

- Rewrite or fix the physics logic (Botcraft or Grim can be used as a reference as well)
- Implement basic minecart / boat / horse riding
- Fix auto jump module (false triggers, performance issues)
- Investigate connection issues to some servers
- Setup a platform for automatic cron testing against the latest version of the anti-cheat plugins
- ...

Goals:

- Make more servers playable. Right now on hypixel-like servers (servers with minigames), only tnt run (and probably ) is fully playable.

Notes:

- You can see the incoming/outgoing packets in the console (F12 in Chrome) by enabling `options.debugLogNotFrequentPackets = true`. However, if you need a FULL log of all packets, you can start recording the packets by going into `Settings` > `Advanced` > `Enable Packets Replay` and then you can download the file and use it to replay the packets.
- You can use mcraft-e2e studio to send the same packets over and over again (which is useful for testing) or use the packets replayer (which is useful for debugging).

## 2. Three.js Renderer

Example tasks:

- Improve / fix entity rendering
- Better update entities on specific packets
- Investigate performance issues under different conditions (instructions provided)
- Work on the playground code

Goals:

- Fix a lot of entity rendering issues (including position updates)
- Implement switching camera mode (first person, third person, etc)
- Animated blocks
- Armor rendering
- ...

Note:

- It's useful to know how to use helpers & additional cameras (e.g. setScissor)

## 3. Server-side Logic

Flying squid fork (space-squid).
Example tasks:

- Add missing commands (e.g. /scoreboard)
- Basic physics (player fall damage, falling blocks & entities)
- Basic entities AI (spawning, attacking)
- Pvp
- Emit more packets on some specific events (e.g. when a player uses an item)
- Make more maps playable (e.g. fix when something is not implemented in both server and client and blocking map interaction)
- ...

Long Term Goals:

- Make most adventure maps playable
- Make a way to complete the game from the scratch (crafting, different dimensions, terrain generation, etc)
- Make bedwars playable!
Most of the tasks are straightforward to implement, just be sure to use a debugger ;). If you feel you are stuck, ask for help on Discord. Absolutely any tests / refactor suggestions are welcome!

## 4. Frontend

New React components, improve UI (including mobile support).

## Workflow

1. Locate the problem on the public test server & make an easily reproducible environment (you can also use local packets replay server or your custom server setup). Dm me for details on public test server / replay server
2. Debug the code, find an issue in the code, isolate the problem
3. Develop, try to fix and test. Finally we should find a way to fix it. It's ideal to have an automatic test but it's not necessary for now
3. Repeat step 1 to make sure the task is done and the problem is fixed (or the feature is implemented)

## Updating Dependencies

1. Use `pnpm update-git-deps` to check and update git dependencies (like mineflayer fork, prismarine packages etc). The script will:
   - Show which git dependencies have updates available
   - Ask if you want to update them
   - Skip dependencies listed in `pnpm.updateConfig.ignoreDependencies`

2. Update PrismarineJS dependencies to the latest version: `minecraft-data` (be sure to replace the version twice in the package.json), `mineflayer`, `minecraft-protocol`, `prismarine-block`, `prismarine-chunk`, `prismarine-item`, ...

3. If `minecraft-protocol` patch fails, do this:
     1. Remove the patch from `patchedDependencies` in `package.json`
     2. Run `pnpm patch minecraft-protocol`, open patch directory
     3. Apply the patch manually in this directory: `patch -p1 < minecraft-protocol@<version>.patch`
     4. Run the suggested command from `pnpm patch ...` (previous step) to update the patch

### Would be useful to have

- cleanup folder & modules structure, cleanup playground code
