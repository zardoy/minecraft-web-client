import { expect, test, vi } from 'vitest'
import * as THREE from 'three'
import { commitSkinTexture, resolveSkinTexture } from './skinTextureOwnership'

test('resolves a loaded texture without trusting the published return type', async () => {
  const texture = new THREE.Texture()

  await expect(resolveSkinTexture(Promise.resolve(texture))).resolves.toBe(texture)
  await expect(resolveSkinTexture(Promise.resolve(undefined))).resolves.toBeUndefined()
})

test('keeps the current texture when a late texture loses ownership', () => {
  const playerObject = { skin: { map: null } } as any
  const textureB = new THREE.Texture()
  const textureA = new THREE.Texture()
  const disposeA = vi.spyOn(textureA, 'dispose')
  const disposeB = vi.spyOn(textureB, 'dispose')

  expect(commitSkinTexture(playerObject, textureB, true)).toBe(true)
  expect(commitSkinTexture(playerObject, textureA, false)).toBe(false)

  expect(playerObject.skin.map).toBe(textureB)
  expect(disposeA).toHaveBeenCalledOnce()
  expect(disposeB).not.toHaveBeenCalled()
})

test('disposes the previous texture when replacing the current skin', () => {
  const playerObject = { skin: { map: null } } as any
  const textureA = new THREE.Texture()
  const textureB = new THREE.Texture()
  const disposeA = vi.spyOn(textureA, 'dispose')

  expect(commitSkinTexture(playerObject, textureA, true)).toBe(true)
  expect(commitSkinTexture(playerObject, textureB, true)).toBe(true)

  expect(playerObject.skin.map).toBe(textureB)
  expect(disposeA).toHaveBeenCalledOnce()
})
