module.exports = {
  'motd': 'A Minecraft Server \nRunning flying-squid',
  // host: '',
  // eslint-disable-next-line unicorn/numeric-separators-style
  'port': 25565,
  'max-players': 10,
  'online-mode': false,
  'gameMode': 0,
  'difficulty': 0,
  'worldFolder': 'world',
  'pluginsFolder': true,
  // todo set sid, disable entities auto-spawn
  'generation': {
    // noise (Minecraft 26.3 noise worldgen from the minecraft-worldgen package; an optional worldgen datapack the player loads is layered on top)
    // empty
    // superflat
    // all_the_blocks
    // nether
    'name': 'noise',
    options: {
      // chunks are generated in Web Workers (see createLocalServer.ts); `workers: 0` forces in-process generation
    }
  },
  'kickTimeout': 10_000,
  'plugins': {},
  'modpe': false,
  'view-distance': 2,
  'player-list-text': {
    'header': 'Flying squid',
    'footer': 'Integrated server'
  },
  keepAlive: false,
  'everybody-op': true,
  'max-entities': 100,
  'version': '1.18',
  versionMajor: '1.18'
}
