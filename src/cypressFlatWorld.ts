/** Flying-squid superflat preset used in Cypress (fast CI singleplayer vs default noise). */
export const CYPRESS_SINGLEPLAYER_FLAT_OVERRIDES = {
  generation: {
    name: 'superflat',
    // eslint-disable-next-line unicorn/numeric-separators-style
    options: { seed: 250869072 },
  },
} as const
