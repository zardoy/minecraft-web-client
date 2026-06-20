import absorption from 'mc-assets/dist/other-textures/latest/mob_effect/absorption.png'
import glowing from 'mc-assets/dist/other-textures/latest/mob_effect/glowing.png'
import instant_health from 'mc-assets/dist/other-textures/latest/mob_effect/instant_health.png'
import nausea from 'mc-assets/dist/other-textures/latest/mob_effect/nausea.png'
import slow_falling from 'mc-assets/dist/other-textures/latest/mob_effect/slow_falling.png'
import weakness from 'mc-assets/dist/other-textures/latest/mob_effect/weakness.png'
import bad_omen from 'mc-assets/dist/other-textures/latest/mob_effect/bad_omen.png'
import haste from 'mc-assets/dist/other-textures/latest/mob_effect/haste.png'
import invisibility from 'mc-assets/dist/other-textures/latest/mob_effect/invisibility.png'
import night_vision from 'mc-assets/dist/other-textures/latest/mob_effect/night_vision.png'
import slowness from 'mc-assets/dist/other-textures/latest/mob_effect/slowness.png'
import wither from 'mc-assets/dist/other-textures/latest/mob_effect/wither.png'
import blindness from 'mc-assets/dist/other-textures/latest/mob_effect/blindness.png'
import health_boost from 'mc-assets/dist/other-textures/latest/mob_effect/health_boost.png'
import jump_boost from 'mc-assets/dist/other-textures/latest/mob_effect/jump_boost.png'
import poison from 'mc-assets/dist/other-textures/latest/mob_effect/poison.png'
import speed from 'mc-assets/dist/other-textures/latest/mob_effect/speed.png'
import conduit_power from 'mc-assets/dist/other-textures/latest/mob_effect/conduit_power.png'
import hero_of_the_village from 'mc-assets/dist/other-textures/latest/mob_effect/hero_of_the_village.png'
import levitation from 'mc-assets/dist/other-textures/latest/mob_effect/levitation.png'
import regeneration from 'mc-assets/dist/other-textures/latest/mob_effect/regeneration.png'
import strength from 'mc-assets/dist/other-textures/latest/mob_effect/strength.png'
import dolphins_grace from 'mc-assets/dist/other-textures/latest/mob_effect/dolphins_grace.png'
import hunger from 'mc-assets/dist/other-textures/latest/mob_effect/hunger.png'
import luck from 'mc-assets/dist/other-textures/latest/mob_effect/luck.png'
import resistance from 'mc-assets/dist/other-textures/latest/mob_effect/resistance.png'
import unluck from 'mc-assets/dist/other-textures/latest/mob_effect/unluck.png'
import fire_resistance from 'mc-assets/dist/other-textures/latest/mob_effect/fire_resistance.png'
import instant_damage from 'mc-assets/dist/other-textures/latest/mob_effect/instant_damage.png'
import mining_fatigue from 'mc-assets/dist/other-textures/latest/mob_effect/mining_fatigue.png'
import saturation from 'mc-assets/dist/other-textures/latest/mob_effect/saturation.png'
import water_breathing from 'mc-assets/dist/other-textures/latest/mob_effect/water_breathing.png'
import darkness from 'mc-assets/dist/other-textures/latest/mob_effect/darkness.png'

interface Images {
  [key: string]: string
}

// Export an object containing image URLs
export const images: Images = {
  absorption,
  glowing,
  instant_health,
  nausea,
  slow_falling,
  weakness,
  bad_omen,
  haste,
  invisibility,
  night_vision,
  slowness,
  wither,
  blindness,
  health_boost,
  jump_boost,
  poison,
  speed,
  conduit_power,
  hero_of_the_village,
  levitation,
  regeneration,
  strength,
  dolphins_grace,
  hunger,
  luck,
  resistance,
  unluck,
  bad_luck: unluck,
  good_luck: luck,
  fire_resistance,
  instant_damage,
  mining_fatigue,
  saturation,
  water_breathing,
  darkness
}
