@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_2d<f32>;

@fragment
fn main(
  @location(0) fragUV: vec2f,
  @location(1) @interpolate(flat) TextureIndex: f32,
  @location(2) @interpolate(flat) ColorBlend: vec3f
) -> @location(0) vec4f {
  let textureSize: vec2<f32> = vec2<f32>(textureDimensions(myTexture));
  let tileSize: vec2<f32> = vec2<f32>(16.0f,16.0f);
  let tilesPerTexture: vec2<f32> = vec2<f32>(textureSize)/tileSize;
  let pixelColor = textureSample(myTexture, mySampler, fragUV/tilesPerTexture + vec2f(trunc(TextureIndex%tilesPerTexture.y),trunc(TextureIndex/tilesPerTexture.x) )/tilesPerTexture);
  return vec4f(pixelColor.xyz, 1.0) * vec4f(ColorBlend/255,1.0);
}
