### Eaglercraft Comparison

This project uses proxies so you can connect to almost any vanilla server. Though proxies have some limitations such as increased latency and servers will complain about using VPN (though we have a workaround for that, but ping will be much higher).
This client generally has better performance but some features reproduction might be inaccurate eg its less stable and more buggy in some cases.

| Feature                           | This project    | Eaglercraft | Description                                                                                                                                                                                                              |
| --------------------------------- | --------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| General                           |                 |             |                                                                                                                                                                                                                          |
| Mobile Support (touch)            | ✅(+)           | ✅          |                                                                                                                                                                                                                          |
| Gamepad Support                   | ✅              | ❌          |                                                                                                                                                                                                                          |
| A11Y                              | ✅              | ❌          | We have DOM for almost all UI so your extensions and other browser features will work natively like on any other web page (but maybe it's not needed)                                                                    |
| Game Features                     |                 |             |                                                                                                                                                                                                                          |
| Servers Support (quality)         | ❌(+)           | ✅          | Eaglercraft is vanilla Minecraft, while this project tries to emulate original game behavior at protocol level (Mineflayer is used)                                                                                      |
| Servers Support (any version, ip) | ✅              | ❌          | We support almost all Minecraft versions, only important if you connect to a server where you need new content like blocks or if you play with friends. And you can connect to almost any server using proxy servers!    |
| Servers Support (online mode)     | ✅              | ❌          | Join to online servers like Hypixel using your Microsoft account without additional proxies                                                                                                                              |
| Singleplayer Survival Features    | ❌              | ✅          | Just like Eaglercraft this project can generate and save worlds, but generator is simple and only a few survival features are supported (look here for [supported features list](https://github.com/zardoy/space-squid)) |
| Singleplayer Maps                 | ✅              | ✅          | We support any version, but adventure maps won't work, but simple parkour and build maps might be interesting to explore...                                                                                              |
| Singleplayer Maps World Streaming | ✅              | ❌          | Thanks to Browserfs, saves can be loaded to local singleplayer server using multiple ways: from local folder, server directory (not zip), dropbox or other cloud _backend_ etc...                                        |
| P2P Multiplayer                   | ✅              | ✅          | A way to connect to other browser running the project. But it's almost useless here since many survival features are not implemented. Maybe only to build / explore maps together...                                     |
| Voice Chat                        | ❌(+)           | ✅          | Eaglercraft has custom WebRTC voice chat implementation, though it could also be easily implemented there                                                                                                                |
| Online Servers                    | ✅              | ❌          | We have custom implementation (including integration on proxy side) for joining to servers                                                                                                                               |
| Plugin Features                   | ✅              | ❌          | We have Mineflayer plugins support, like Auto Jump & Auto Parkour was added here that way                                                                                                                                |
| Direct Connection                 | ✅              | ✅          | We have DOM for almost all UI so your extensions and other browser features will work natively like on any other web page                                                                                                |
| Moding                            | ✅(own js mods) | ❌          | This project will support mods for singleplayer. In theory its possible to implement support for modded servers on protocol level (including all needed mods)                                                            |
| Video Recording                   | ❌              | ✅          | Doesn't feel needed                                                                                                                                                                                                      |
| Metaverse Features                | ✅(50%)         | ❌          | We have videos / images support inside world, but not iframes (custom protocol channel)                                                                                                                                  |
| Sounds                            | ✅              | ✅          |                                                                                                                                                                                                                          |
| Resource Packs                    | ✅(+extras)     | ✅          | This project has very limited support for them (only textures images are loadable for now)                                                                                                                               |
| Assets Compressing & Splitting    | ✅              | ❌          | We have advanced Minecraft data processing and good code chunk splitting so the web app will open much faster and use less memory                                                                                        |
| Graphics                          |                 |             |                                                                                                                                                                                                                          |
| Fancy Graphics                    | ❌              | ✅          | While Eaglercraft has top-level shaders we don't even support lighting                                                                                                                                                   |
| Fast & Efficient Graphics         | ❌(+)           | ❌          | Feels like no one needs to have 64 rendering distance work smoothly                                                                                                                                                      |
| VR                                | ✅(-)           | ❌          | Feels like not needed feature. UI is missing in this project since DOM can't be rendered in VR so Eaglercraft could be better in that aspect                                                                             |
| AR                                | ❌              | ❌          | Would be the most useless feature                                                                                                                                                                                        |
| Minimap & Waypoints               | ✅(-)           | ❌          | We have buggy minimap, which can be enabled in settings and full map is opened by pressing `M` key                                                                                                                       |

Features available to only this project:

- CSS & JS Customization
- JS Real Time Debugging & Console Scripting (eg Devtools)

### Tech Stack

Bundler: Rsbuild!
UI: powered by React and css modules. Storybook helps with UI development.

### Rare WEB Features

There are a number of web features that are not commonly used but you might be interested in them if you decide to build your own game in the web.

TODO

| API                                                    | Usage & Description                                                                                                                           |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `Crypto` API                                           | Used to make chat features work when joining online servers with authentication.                                                              |
| `requestPointerLock({ unadjustedMovement: true })` API | Required for games. Disables system mouse acceleration (important for Mac users). Aka mouse raw input                                         |
| `navigator.keyboard.lock()`                            | (only in Chromium browsers) When entering fullscreen it allows to use any key combination like ctrl+w in the game                             |
| `navigator.keyboard.getLayoutMap()`                    | (only in Chromium browsers) To display the right keyboard symbol for the key keybinding on different keyboard layouts (e.g. QWERTY vs AZERTY) |
