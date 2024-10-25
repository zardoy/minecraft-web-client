export type AnimationControlSwitches = {
  tick: number
  interpolationTick: number // next one
}

type Data = {
  interpolate: boolean;
  frametime: number;
  frames: Array<{
    index: number;
    time: number;
  } | number> | undefined;
}

export class TextureAnimation {
  data: Data
  frameImages: number
  frameDelta: number
  frameTime: number
  framesToSwitch: number
  frameIndex: number

  constructor (public animationControl: AnimationControlSwitches, data: Data, public framesImages: number) {
    this.data = {
      interpolate: false,
      frametime: 1,
      ...data
    }
    this.frameImages = 1
    this.frameDelta = 0
    this.frameTime = this.data.frametime * 50
    this.frameIndex = 0

    this.framesToSwitch = this.frameImages
    if (this.data.frames) {
      this.framesToSwitch = this.data.frames.length
    }
  }

  step (deltaMs: number) {
    this.frameDelta += deltaMs

    if (this.frameDelta > this.frameTime) {
      this.frameDelta -= this.frameTime
      this.frameDelta %= this.frameTime

      this.frameIndex++
      this.frameIndex %= this.framesToSwitch

      const frames = this.data.frames.map(frame => (typeof frame === 'number' ? { index: frame, time: this.data.frametime } : frame))
      if (frames) {
        const frame = frames[this.frameIndex]
        const nextFrame = frames[(this.frameIndex + 1) % this.framesToSwitch]

        this.animationControl.tick = frame.index
        this.animationControl.interpolationTick = nextFrame.index
        this.frameTime = frame.time * 50
      } else {
        this.animationControl.tick = this.frameIndex
        this.animationControl.interpolationTick = (this.frameIndex + 1) % this.framesToSwitch
      }
    }

    if (this.data.interpolate) {
      this.animationControl.interpolationTick = this.frameDelta / this.frameTime
    }
  }

}
