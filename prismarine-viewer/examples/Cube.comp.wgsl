struct Cube {
  cube : array<u32, 2>
}

struct Chunk{
  x : i32,
  z : i32,
  cubesCount : u32
}

struct IndirectDrawParams {
  vertexCount: u32,
  instanceCount: atomic<u32>,
  firstVertex: u32,
  firstInstance: u32,
}

struct CubePointer {
  ptr: array<u32, 2>
}

@group(0) @binding(0) var<uniform> ViewProjectionMatrix: mat4x4<f32>;
@group(1) @binding(0) var<storage, read> chunks : array<Chunk>;
@group(0) @binding(1) var<storage, read_write> cubes: array<Cube>;
@group(0) @binding(2) var<storage, read_write> visibleCubes: array<CubePointer>;
@group(0) @binding(3) var<storage, read_write> drawParams: IndirectDrawParams;
             
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  if (index >= arrayLength(&cubes)) {
    return;
  }

  //   position: vec3f,
  // textureIndex: f32,
  // colorBlend: vec3f,
  let cube = cubes[index];

  var counter : u32 = 0;
  var i : u32 = 0;
  while (counter + chunks[i].cubesCount < index)
  {
      if (i >= arrayLength(&chunks)) {
    return;
    }

      counter += chunks[i].cubesCount;
      i++;
  }


  // if (i >= arrayLength(&chunks)) {
  //   return;
  // }

  let chunk = chunks[i];


  let positionX : f32 = f32(i32(cube.cube[0] & 15) + chunk.x * 16); //4 bytes
  let positionY : f32 = f32((cube.cube[0] >> 4) & 511); //9 bytes
  let positionZ : f32 = f32(i32((cube.cube[0] >> 13) & 15) + chunk.z * 16); // 4 bytes
  let position = vec4f(positionX, positionY, positionZ, 1.0);
  // let textureIndex : f32 = f32((cube.cube[0] >> 24) & 8);
  // let colorBlendR : f32 = f32(cube.cube[1] & 8);
  // let colorBlendG : f32 = f32((cube.cube[1] >> 8) & 8);
  // let colorBlendB : f32 = f32((cube.cube[1] >> 16) & 8);
  // let colorBlend = vec3f(colorBlendR, colorBlendG, colorBlendB);
  //last 8 bits reserved for animations

  // Transform cube position to clip space
  let clipPos = ViewProjectionMatrix * (position + vec4<f32>(0.5, 0.0, 0.5, 0.0));
  let clipDepth = clipPos.z / clipPos.w; // Obtain depth in clip space
  let clipX = clipPos.x / clipPos.w;
  let clipY = clipPos.y / clipPos.w;

  // Check if cube is within the view frustum z-range (depth within near and far planes)
  let Oversize = 1.25;
  if (
      clipDepth > 0 && clipDepth <=  1 &&
      clipX >= -Oversize && clipX <= Oversize &&
      clipY >= - Oversize && clipY <= Oversize) 
  { //Small Oversize because binding size
    let visibleIndex = atomicAdd(&drawParams.instanceCount, 1);
    visibleCubes[visibleIndex].ptr[0] = index;
    visibleCubes[visibleIndex].ptr[1] = i;
   // cubes[index].cube[1] = ((i << 24) | (cubes[index].cube[1] & 16777215));
   // cubes[index].cube[0] = (((i>>8) << 27) | (cubes[index].cube[0] & 134217727));
  }
}
