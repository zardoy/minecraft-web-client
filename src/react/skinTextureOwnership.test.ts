import { expect, test, vi } from 'vitest'
import * as THREE from 'three'
import { commitSkinTexture } from './skinTextureOwnership'

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
