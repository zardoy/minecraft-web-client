export const server = ({ host: sessionServer }) => {
  return {
    async join(accessToken, sessionSelectedProfileId, serverId, sharedSecret, publicKey, cb) {
      try {
        const result = await fetch(`${sessionServer}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            accessToken,
            selectedProfile: sessionSelectedProfileId,
            serverId,
            sharedSecret,
            publicKey
          })
        })
        if (!result.ok) {
          throw new Error(`Request failed ${await result.text()}`)
        }
        cb(null)
      } catch (err) {
        cb(err)
      }
    }
  }
}
