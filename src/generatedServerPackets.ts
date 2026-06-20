// from server to client

export interface ClientOnMap {
  keep_alive: /** 1.7 */
    | {
        keepAliveId: number
      }
    | /** 1.12.2 */ {
        keepAliveId: bigint
      }
  login: /** 1.8 */
    | {
        entityId: number
        gameMode: number
        dimension: number
        difficulty: number
        maxPlayers: number
        levelType: string
        reducedDebugInfo: boolean
      }
    | /** 1.14 */ {
        entityId: number
        gameMode: number
        dimension: number
        maxPlayers: number
        levelType: string
        viewDistance: number
        reducedDebugInfo: boolean
      }
    | /** 1.15 */ {
        entityId: number
        gameMode: number
        dimension: number
        hashedSeed: bigint
        maxPlayers: number
        levelType: string
        viewDistance: number
        reducedDebugInfo: boolean
        enableRespawnScreen: boolean
      }
    | /** 1.16 */ {
        entityId: number
        gameMode: number
        previousGameMode: number
        worldNames: any
        dimensionCodec: any
        dimension: string
        worldName: string
        hashedSeed: bigint
        maxPlayers: number
        viewDistance: number
        reducedDebugInfo: boolean
        enableRespawnScreen: boolean
        isDebug: boolean
        isFlat: boolean
      }
    | /** 1.16.2 */ {
        entityId: number
        isHardcore: boolean
        gameMode: number
        previousGameMode: number
        worldNames: any
        dimensionCodec: any
        dimension: any
        worldName: string
        hashedSeed: bigint
        maxPlayers: number
        viewDistance: number
        reducedDebugInfo: boolean
        enableRespawnScreen: boolean
        isDebug: boolean
        isFlat: boolean
      }
    | /** 1.18 */ {
        entityId: number
        isHardcore: boolean
        gameMode: number
        previousGameMode: number
        worldNames: any
        dimensionCodec: any
        dimension: any
        worldName: string
        hashedSeed: bigint
        maxPlayers: number
        viewDistance: number
        simulationDistance: number
        reducedDebugInfo: boolean
        enableRespawnScreen: boolean
        isDebug: boolean
        isFlat: boolean
      }
    | /** 1.19 */ {
        entityId: number
        isHardcore: boolean
        gameMode: number
        previousGameMode: number
        worldNames: any
        dimensionCodec: any
        worldType: string
        worldName: string
        hashedSeed: bigint
        maxPlayers: number
        viewDistance: number
        simulationDistance: number
        reducedDebugInfo: boolean
        enableRespawnScreen: boolean
        isDebug: boolean
        isFlat: boolean
        death: any
      }
    | /** 1.20 */ {
        entityId: number
        isHardcore: boolean
        gameMode: number
        previousGameMode: number
        worldNames: any
        dimensionCodec: any
        worldType: string
        worldName: string
        hashedSeed: bigint
        maxPlayers: number
        viewDistance: number
        simulationDistance: number
        reducedDebugInfo: boolean
        enableRespawnScreen: boolean
        isDebug: boolean
        isFlat: boolean
        death: any
        portalCooldown: number
      }
  /** Removed in 1.19 */
  chat: /** 1.7 */
    | {
        message: string
      }
    | /** 1.8 */ {
        message: string
        position: number
      }
    | /** 1.16 */ {
        message: string
        position: number
        sender: any
      }
  update_time: /** 1.7 */ {
    age: bigint
    time: bigint
  }
  entity_equipment: /** 1.7 */
    | {
        entityId: number
        slot: number
        item: any
      }
    | /** 1.16 */ {
        entityId: number
        equipments: any
      }
  spawn_position: /** 1.8 */
    | {
        location: { x: number; y: number; z: number }
      }
    | /** 1.17 */ {
        location: { x: number; y: number; z: number }
        angle: number
      }
  update_health: /** 1.7 */ {
    health: number
    food: number
    foodSaturation: number
  }
  respawn: /** 1.7 */
    | {
        dimension: number
        difficulty: number
        gamemode: number
        levelType: string
      }
    | /** 1.14 */ {
        dimension: number
        gamemode: number
        levelType: string
      }
    | /** 1.15 */ {
        dimension: number
        hashedSeed: bigint
        gamemode: number
        levelType: string
      }
    | /** 1.16 */ {
        dimension: string
        worldName: string
        hashedSeed: bigint
        gamemode: number
        previousGamemode: number
        isDebug: boolean
        isFlat: boolean
        copyMetadata: boolean
      }
    | /** 1.16.2 */ {
        dimension: any
        worldName: string
        hashedSeed: bigint
        gamemode: number
        previousGamemode: number
        isDebug: boolean
        isFlat: boolean
        copyMetadata: boolean
      }
    | /** 1.19 */ {
        dimension: string
        worldName: string
        hashedSeed: bigint
        gamemode: number
        previousGamemode: number
        isDebug: boolean
        isFlat: boolean
        copyMetadata: boolean
        death: any
      }
    | /** 1.20 */ {
        dimension: string
        worldName: string
        hashedSeed: bigint
        gamemode: number
        previousGamemode: number
        isDebug: boolean
        isFlat: boolean
        copyMetadata: boolean
        death: any
        portalCooldown: number
      }
  position: /** 1.8 */
    | {
        x: number
        y: number
        z: number
        yaw: number
        pitch: number
        flags: number
      }
    | /** 1.9 */ {
        x: number
        y: number
        z: number
        yaw: number
        pitch: number
        flags: number
        teleportId: number
      }
    | /** 1.17 */ {
        x: number
        y: number
        z: number
        yaw: number
        pitch: number
        flags: number
        teleportId: number
        dismountVehicle: boolean
      } /** 1.19.4 */
  held_item_slot: /** 1.7 */ {
    slot: number
  }
  /** Removed in 1.14 */
  bed: /** 1.7 */
    | {
        entityId: number
        location: any
      }
    | /** 1.8 */ {
        entityId: number
        location: { x: number; y: number; z: number }
      }
  animation: /** 1.7 */ {
    entityId: number
    animation: number
  }
  named_entity_spawn: /** 1.7 */
    | {
        entityId: number
        playerUUID: string
        playerName: string
        data: any
        x: number
        y: number
        z: number
        yaw: number
        pitch: number
        currentItem: number
        metadata: any
      }
    | /** 1.8 */ {
        entityId: number
        playerUUID: any
        x: number
        y: number
        z: number
        yaw: number
        pitch: number
        currentItem: number
        metadata: any
      }
    | /** 1.9 */ {
        entityId: number
        playerUUID: any
        x: number
        y: number
        z: number
        yaw: number
        pitch: number
        metadata: any
      }
    | /** 1.15 */ {
        entityId: number
        playerUUID: any
        x: number
        y: number
        z: number
        yaw: number
        pitch: number
      }
  collect: /** 1.7 */
    | {
        collectedEntityId: number
        collectorEntityId: number
      }
    | /** 1.11 */ {
        collectedEntityId: number
        collectorEntityId: number
        pickupItemCount: number
      }
  spawn_entity: /** 1.7 */
    | {
        entityId: number
        type: number
        x: number
        y: number
        z: number
        pitch: number
        yaw: number
        objectData: any
      }
    | /** 1.9 */ {
        entityId: number
        objectUUID: any
        type: number
        x: number
        y: number
        z: number
        pitch: number
        yaw: number
        objectData: number
        velocityX: number
        velocityY: number
        velocityZ: number
      }
    | /** 1.19 */ {
        entityId: number
        objectUUID: any
        type: number
        x: number
        y: number
        z: number
        pitch: number
        yaw: number
        headPitch: number
        objectData: number
        velocityX: number
        velocityY: number
        velocityZ: number
      }
  /** Removed in 1.19 */
  spawn_entity_living: /** 1.7 */
    | {
        entityId: number
        type: number
        x: number
        y: number
        z: number
        yaw: number
        pitch: number
        headPitch: number
        velocityX: number
        velocityY: number
        velocityZ: number
        metadata: any
      }
    | /** 1.9 */ {
        entityId: number
        entityUUID: any
        type: number
        x: number
        y: number
        z: number
        yaw: number
        pitch: number
        headPitch: number
        velocityX: number
        velocityY: number
        velocityZ: number
        metadata: any
      }
    | /** 1.15 */ {
        entityId: number
        entityUUID: any
        type: number
        x: number
        y: number
        z: number
        yaw: number
        pitch: number
        headPitch: number
        velocityX: number
        velocityY: number
        velocityZ: number
      }
  /** Removed in 1.19 */
  spawn_entity_painting: /** 1.7 */
    | {
        entityId: number
        title: string
        location: any
        direction: number
      }
    | /** 1.8 */ {
        entityId: number
        title: string
        location: { x: number; y: number; z: number }
        direction: number
      }
    | /** 1.9 */ {
        entityId: number
        entityUUID: any
        title: string
        location: { x: number; y: number; z: number }
        direction: number
      }
    | /** 1.13 */ {
        entityId: number
        entityUUID: any
        title: number
        location: { x: number; y: number; z: number }
        direction: number
      }
  spawn_entity_experience_orb: /** 1.7 */ {
    entityId: number
    x: number
    y: number
    z: number
    count: number
  }
  entity_velocity: /** 1.7 */ {
    entityId: number
    velocityX: number
    velocityY: number
    velocityZ: number
  }
  /** Removed in 1.17 */
  entity_destroy: /** 1.17.1 */ {
    entityIds: any
  }
  /** Removed in 1.17 */
  entity: /** 1.7 */ {
    entityId: number
  }
  rel_entity_move: /** 1.7 */
    | {
        entityId: number
        dX: number
        dY: number
        dZ: number
      }
    | /** 1.8 */ {
        entityId: number
        dX: number
        dY: number
        dZ: number
        onGround: boolean
      }
  entity_look: /** 1.7 */
    | {
        entityId: number
        yaw: number
        pitch: number
      }
    | /** 1.8 */ {
        entityId: number
        yaw: number
        pitch: number
        onGround: boolean
      }
  entity_move_look: /** 1.7 */
    | {
        entityId: number
        dX: number
        dY: number
        dZ: number
        yaw: number
        pitch: number
      }
    | /** 1.8 */ {
        entityId: number
        dX: number
        dY: number
        dZ: number
        yaw: number
        pitch: number
        onGround: boolean
      }
  entity_teleport: /** 1.7 */
    | {
        entityId: number
        x: number
        y: number
        z: number
        yaw: number
        pitch: number
      }
    | /** 1.8 */ {
        entityId: number
        x: number
        y: number
        z: number
        yaw: number
        pitch: number
        onGround: boolean
      }
  entity_head_rotation: /** 1.7 */ {
    entityId: number
    headYaw: number
  }
  entity_status: /** 1.7 */ {
    entityId: number
    entityStatus: number
  }
  attach_entity: /** 1.7 */
    | {
        entityId: number
        vehicleId: number
        leash: boolean
      }
    | /** 1.9 */ {
        entityId: number
        vehicleId: number
      }
  entity_metadata: /** 1.7 */ {
    entityId: number
    metadata: any
  }
  entity_effect: /** 1.7 */
    | {
        entityId: number
        effectId: number
        amplifier: number
        duration: number
      }
    | /** 1.8 */ {
        entityId: number
        effectId: number
        amplifier: number
        duration: number
        hideParticles: boolean
      }
    | /** 1.9 */ {
        entityId: number
        effectId: number
        amplifier: number
        duration: number
        hideParticles: number
      }
    | /** 1.19 */ {
        entityId: number
        effectId: number
        amplifier: number
        duration: number
        hideParticles: number
        factorCodec: any
      }
  remove_entity_effect: /** 1.7 */ {
    entityId: number
    effectId: number
  }
  experience: /** 1.7 */
    | {
        experienceBar: number
        level: number
        totalExperience: number
      }
    | /** 1.19.3 */ {
        experienceBar: number
        totalExperience: number
        level: number
      }
  /** Removed in 1.9 */
  update_attributes: /** 1.7 */ {
    entityId: number
    properties: any
  }
  map_chunk: /** 1.7 */
    | {
        x: number
        z: number
        groundUp: boolean
        bitMap: number
        addBitMap: number
        compressedChunkData: any
      }
    | /** 1.8 */ {
        x: number
        z: number
        groundUp: boolean
        bitMap: number
        chunkData: any
      }
    | /** 1.9.4 */ {
        x: number
        z: number
        groundUp: boolean
        bitMap: number
        chunkData: any
        blockEntities: any
      }
    | /** 1.14 */ {
        x: number
        z: number
        groundUp: boolean
        bitMap: number
        heightmaps: any
        chunkData: any
        blockEntities: any
      }
    | /** 1.15 */ {
        x: number
        z: number
        groundUp: boolean
        bitMap: number
        heightmaps: any
        biomes: any
        chunkData: any
        blockEntities: any
      }
    | /** 1.16 */ {
        x: number
        z: number
        groundUp: boolean
        ignoreOldData: boolean
        bitMap: number
        heightmaps: any
        biomes: any
        chunkData: any
        blockEntities: any
      } /** 1.16.2 */
    | /** 1.17 */ {
        x: number
        z: number
        bitMap: any
        heightmaps: any
        biomes: any
        chunkData: any
        blockEntities: any
      }
    | /** 1.18 */ {
        x: number
        z: number
        heightmaps: any
        chunkData: any
        blockEntities: any
        trustEdges: boolean
        skyLightMask: any
        blockLightMask: any
        emptySkyLightMask: any
        emptyBlockLightMask: any
        skyLight: any
        blockLight: any
      }
    | /** 1.20 */ {
        x: number
        z: number
        heightmaps: any
        chunkData: any
        blockEntities: any
        skyLightMask: any
        blockLightMask: any
        emptySkyLightMask: any
        emptyBlockLightMask: any
        skyLight: any
        blockLight: any
      }
  multi_block_change: /** 1.7 */
    | {
        chunkX: number
        chunkZ: number
        recordCount: any
        dataLength: number
        records: any
      }
    | /** 1.8 */ {
        chunkX: number
        chunkZ: number
        records: any
      }
    | /** 1.16.2 */ {
        chunkCoordinates: any
        notTrustEdges: boolean
        records: any
      }
    | /** 1.19.2 */ {
        chunkCoordinates: any
        suppressLightUpdates: boolean
        records: any
      }
    | /** 1.20 */ {
        chunkCoordinates: any
        records: any
      }
  block_change: /** 1.7 */
    | {
        location: any
        type: number
        metadata: number
      }
    | /** 1.8 */ {
        location: { x: number; y: number; z: number }
        type: number
      }
  block_action: /** 1.7 */
    | {
        location: any
        byte1: number
        byte2: number
        blockId: number
      }
    | /** 1.8 */ {
        location: { x: number; y: number; z: number }
        byte1: number
        byte2: number
        blockId: number
      }
  block_break_animation: /** 1.7 */
    | {
        entityId: number
        location: any
        destroyStage: number
      }
    | /** 1.8 */ {
        entityId: number
        location: { x: number; y: number; z: number }
        destroyStage: number
      }
  /** Removed in 1.9 */
  map_chunk_bulk: /** 1.7 */
    | {
        chunkColumnCount: any
        dataLength: any
        skyLightSent: boolean
        compressedChunkData: any
        meta: any
      }
    | /** 1.8 */ {
        skyLightSent: boolean
        meta: any
        data: any
      }
  explosion: /** 1.7 */ {
    x: number
    y: number
    z: number
    radius: number
    affectedBlockOffsets: any
    playerMotionX: number
    playerMotionY: number
    playerMotionZ: number
  }
  world_event: /** 1.7 */
    | {
        effectId: number
        location: any
        data: number
        global: boolean
      }
    | /** 1.8 */ {
        effectId: number
        location: { x: number; y: number; z: number }
        data: number
        global: boolean
      }
  /** Removed in 1.19.3 */
  named_sound_effect: /** 1.7 */
    | {
        soundName: string
        x: number
        y: number
        z: number
        volume: number
        pitch: number
      }
    | /** 1.9 */ {
        soundName: string
        soundCategory: number
        x: number
        y: number
        z: number
        volume: number
        pitch: number
      }
    | /** 1.19 */ {
        soundName: string
        soundCategory: number
        x: number
        y: number
        z: number
        volume: number
        pitch: number
        seed: bigint
      }
  world_particles: /** 1.7 */
    | {
        particleName: string
        x: number
        y: number
        z: number
        offsetX: number
        offsetY: number
        offsetZ: number
        particleData: number
        particles: number
      }
    | /** 1.8 */ {
        particleId: number
        longDistance: boolean
        x: number
        y: number
        z: number
        offsetX: number
        offsetY: number
        offsetZ: number
        particleData: number
        particles: number
        data: any
      }
  game_state_change: /** 1.7 */ {
    reason: number
    gameMode: number
  }
  /** Removed in 1.16 */
  spawn_entity_weather: /** 1.7 */ {
    entityId: number
    type: number
    x: number
    y: number
    z: number
  }
  open_window: /** 1.7 */
    | {
        windowId: number
        inventoryType: number
        windowTitle: string
        slotCount: number
        useProvidedTitle: boolean
        entityId: any
      }
    | /** 1.8 */ {
        windowId: number
        inventoryType: string
        windowTitle: string
        slotCount: number
        entityId: any
      }
    | /** 1.14 */ {
        windowId: number
        inventoryType: number
        windowTitle: string
      }
  close_window: /** 1.7 */ {
    windowId: number
  }
  set_slot: /** 1.7 */
    | {
        windowId: number
        slot: number
        item: any
      }
    | /** 1.17.1 */ {
        windowId: number
        stateId: number
        slot: number
        item: any
      }
  window_items: /** 1.7 */
    | {
        windowId: number
        items: any
      }
    | /** 1.17.1 */ {
        windowId: number
        stateId: number
        items: any
        carriedItem: any
      }
  craft_progress_bar: /** 1.7 */ {
    windowId: number
    property: number
    value: number
  }
  /** Removed in 1.17 */
  transaction: /** 1.7 */ {
    windowId: number
    action: number
    accepted: boolean
  }
  /** Removed in 1.9.4 */
  update_sign: /** 1.7 */
    | {
        location: any
        text1: string
        text2: string
        text3: string
        text4: string
      }
    | /** 1.8 */ {
        location: { x: number; y: number; z: number }
        text1: string
        text2: string
        text3: string
        text4: string
      }
  map: /** 1.7 */
    | {
        itemDamage: number
        data: any
      }
    | /** 1.8 */ {
        itemDamage: number
        scale: number
        icons: any
        columns: number
        rows: any
        x: any
        y: any
        data: any
      }
    | /** 1.9 */ {
        itemDamage: number
        scale: number
        trackingPosition: boolean
        icons: any
        columns: number
        rows: any
        x: any
        y: any
        data: any
      }
    | /** 1.14 */ {
        itemDamage: number
        scale: number
        trackingPosition: boolean
        locked: boolean
        icons: any
        columns: number
        rows: any
        x: any
        y: any
        data: any
      }
    | /** 1.17 */ {
        itemDamage: number
        scale: number
        locked: boolean
        icons: any
        columns: number
        rows: any
        x: any
        y: any
        data: any
      }
  tile_entity_data: /** 1.7 */
    | {
        location: any
        action: number
        nbtData: any
      }
    | /** 1.8 */ {
        location: { x: number; y: number; z: number }
        action: number
        nbtData: any
      }
  open_sign_entity: /** 1.7 */
    | {
        location: any
      }
    | /** 1.8 */ {
        location: { x: number; y: number; z: number }
      }
    | /** 1.20 */ {
        location: { x: number; y: number; z: number }
        isFrontText: boolean
      }
  statistics: /** 1.7 */ {
    entries: any
  }
  player_info: /** 1.8 */ {
    action: number
    data: any
  }
  abilities: /** 1.7 */ {
    flags: number
    flyingSpeed: number
    walkingSpeed: number
  }
  tab_complete: /** 1.7 */
    | {
        matches: any
      }
    | /** 1.13 */ {
        transactionId: number
        start: number
        length: number
        matches: any
      }
  scoreboard_objective: /** 1.8 */ {
    name: string
    action: number
    displayText: any
    type: any
  }
  scoreboard_score: /** 1.8 */ {
    itemName: string
    action: number
    scoreName: string
    value: any
  }
  scoreboard_display_objective: /** 1.7 */ {
    position: number
    name: string
  }
  /** Removed in 1.9 */
  scoreboard_team: /** 1.7 */
    | {
        team: string
        mode: number
        name: any
        prefix: any
        suffix: any
        friendlyFire: any
        players: any
      }
    | /** 1.8 */ {
        team: string
        mode: number
        name: any
        prefix: any
        suffix: any
        friendlyFire: any
        nameTagVisibility: any
        color: any
        players: any
      }
  custom_payload: /** 1.7 */ {
    channel: string
    data: any
  }
  kick_disconnect: /** 1.7 */ {
    reason: string
  }
  packet: /** 1.7 */ {
    name: any
    params: any
  }
  difficulty: /** 1.8 */
    | {
        difficulty: number
      }
    | /** 1.14 */ {
        difficulty: number
        difficultyLocked: boolean
      }
  /** Removed in 1.17 */
  combat_event: /** 1.8 */ {
    event: number
    duration: any
    playerId: any
    entityId: any
    message: any
  }
  camera: /** 1.8 */ {
    cameraId: number
  }
  /** Removed in 1.17 */
  world_border: /** 1.8 */ {
    action: number
    radius: any
    x: any
    z: any
    old_radius: any
    new_radius: any
    speed: any
    portalBoundary: any
    warning_time: any
    warning_blocks: any
  }
  /** Removed in 1.17 */
  title: /** 1.8 */ {
    action: number
    text: any
    fadeIn: any
    stay: any
    fadeOut: any
  }
  /** Removed in 1.9 */
  set_compression: /** 1.8 */ {
    threshold: number
  }
  playerlist_header: /** 1.8 */ {
    header: string
    footer: string
  }
  resource_pack_send: /** 1.8 */
    | {
        url: string
        hash: string
      }
    | /** 1.17 */ {
        url: string
        hash: string
        forced: boolean
        promptMessage: any
      }
  /** Removed in 1.9 */
  update_entity_nbt: /** 1.8 */ {
    entityId: number
    tag: any
  }
  boss_bar: /** 1.9 */ {
    entityUUID: any
    action: number
    title: any
    health: any
    color: any
    dividers: any
    flags: any
  }
  set_cooldown: /** 1.9 */ {
    itemID: number
    cooldownTicks: number
  }
  unload_chunk: /** 1.9 */ {
    chunkX: number
    chunkZ: number
  }
  vehicle_move: /** 1.9 */ {
    x: number
    y: number
    z: number
    yaw: number
    pitch: number
  }
  set_passengers: /** 1.9 */ {
    entityId: number
    passengers: any
  }
  teams: /** 1.9 */
    | {
        team: string
        mode: number
        name: any
        prefix: any
        suffix: any
        friendlyFire: any
        nameTagVisibility: any
        collisionRule: any
        color: any
        players: any
      }
    | /** 1.13 */ {
        team: string
        mode: number
        name: any
        friendlyFire: any
        nameTagVisibility: any
        collisionRule: any
        formatting: any
        prefix: any
        suffix: any
        players: any
      }
  sound_effect: /** 1.9 */
    | {
        soundId: number
        soundCategory: number
        x: number
        y: number
        z: number
        volume: number
        pitch: number
      }
    | /** 1.19 */ {
        soundId: number
        soundCategory: number
        x: number
        y: number
        z: number
        volume: number
        pitch: number
        seed: bigint
      }
  entity_update_attributes: /** 1.9 */ {
    entityId: number
    properties: any
  }
  advancements: /** 1.12 */ {
    reset: boolean
    advancementMapping: any
    identifiers: any
    progressMapping: any
  }
  unlock_recipes: /** 1.12 */
    | {
        action: number
        craftingBookOpen: boolean
        filteringCraftable: boolean
        recipes1: any
        recipes2: any
      }
    | /** 1.13 */ {
        action: number
        craftingBookOpen: boolean
        filteringCraftable: boolean
        smeltingBookOpen: boolean
        filteringSmeltable: boolean
        recipes1: any
        recipes2: any
      }
    | /** 1.16.2 */ {
        action: number
        craftingBookOpen: boolean
        filteringCraftable: boolean
        smeltingBookOpen: boolean
        filteringSmeltable: boolean
        blastFurnaceOpen: boolean
        filteringBlastFurnace: boolean
        smokerBookOpen: boolean
        filteringSmoker: boolean
        recipes1: any
        recipes2: any
      }
  select_advancement_tab: /** 1.12 */ {
    id: any
  }
  craft_recipe_response: /** 1.12.1 */
    | {
        windowId: number
        recipe: number
      }
    | /** 1.13 */ {
        windowId: number
        recipe: string
      }
  declare_commands: /** 1.13 */ {
    nodes: any
    rootIndex: number
  }
  face_player: /** 1.13 */ {
    feet_eyes: number
    x: number
    y: number
    z: number
    isEntity: boolean
    entityId: any
    entity_feet_eyes: any
  }
  nbt_query_response: /** 1.13 */ {
    transactionId: number
    nbt: any
  }
  stop_sound: /** 1.13 */ {
    flags: number
    source: any
    sound: any
  }
  declare_recipes: /** 1.13 */ {
    recipes: any
  }
  tags: /** 1.13 */
    | {
        blockTags: any
        itemTags: any
        fluidTags: any
      }
    | /** 1.14 */ {
        blockTags: any
        itemTags: any
        fluidTags: any
        entityTags: any
      }
    | /** 1.17 */ {
        tags: any
      }
  open_horse_window: /** 1.14 */ {
    windowId: number
    nbSlots: number
    entityId: number
  }
  update_light: /** 1.14 */
    | {
        chunkX: number
        chunkZ: number
        skyLightMask: number
        blockLightMask: number
        emptySkyLightMask: number
        emptyBlockLightMask: number
        data: any
      }
    | /** 1.16 */ {
        chunkX: number
        chunkZ: number
        trustEdges: boolean
        skyLightMask: number
        blockLightMask: number
        emptySkyLightMask: number
        emptyBlockLightMask: number
        data: any
      }
    | /** 1.17 */ {
        chunkX: number
        chunkZ: number
        trustEdges: boolean
        skyLightMask: any
        blockLightMask: any
        emptySkyLightMask: any
        emptyBlockLightMask: any
        skyLight: any
        blockLight: any
      }
    | /** 1.20 */ {
        chunkX: number
        chunkZ: number
        skyLightMask: any
        blockLightMask: any
        emptySkyLightMask: any
        emptyBlockLightMask: any
        skyLight: any
        blockLight: any
      }
  trade_list: /** 1.14 */
    | {
        windowId: number
        trades: any
        villagerLevel: number
        experience: number
        isRegularVillager: boolean
      }
    | /** 1.14.3 */ {
        windowId: number
        trades: any
        villagerLevel: number
        experience: number
        isRegularVillager: boolean
        canRestock: boolean
      }
  open_book: /** 1.14 */ {
    hand: number
  }
  update_view_position: /** 1.14 */ {
    chunkX: number
    chunkZ: number
  }
  update_view_distance: /** 1.14 */ {
    viewDistance: number
  }
  entity_sound_effect: /** 1.14 */
    | {
        soundId: number
        soundCategory: number
        entityId: number
        volume: number
        pitch: number
      }
    | /** 1.19.2 */ {
        soundId: number
        soundCategory: number
        entityId: number
        volume: number
        pitch: number
        seed: bigint
      }
  acknowledge_player_digging: /** 1.14.4 */
    | {
        location: { x: number; y: number; z: number }
        block: number
        status: number
        successful: boolean
      }
    | /** 1.19 */ {
        sequenceId: number
      }
  end_combat_event: /** 1.17 */
    | {
        duration: number
        entityId: number
      }
    | /** 1.20 */ {
        duration: number
      }
  enter_combat_event: /** 1.17 */ {}
  death_combat_event: /** 1.17 */
    | {
        playerId: number
        entityId: number
        message: string
      }
    | /** 1.20 */ {
        playerId: number
        message: string
      }
  /** Removed in 1.17.1 */
  destroy_entity: /** 1.17 */ {
    entityId: number
  }
  /** Removed in 1.19 */
  sculk_vibration_signal: /** 1.17 */ {
    sourcePosition: { x: number; y: number; z: number }
    destinationIdentifier: string
    destination: any
    arrivalTicks: number
  }
  clear_titles: /** 1.17 */ {
    reset: boolean
  }
  initialize_world_border: /** 1.17 */
    | {
        x: number
        z: number
        oldDiameter: number
        newDiameter: number
        speed: any
        portalTeleportBoundary: number
        warningBlocks: number
        warningTime: number
      }
    | /** 1.19 */ {
        x: number
        z: number
        oldDiameter: number
        newDiameter: number
        speed: number
        portalTeleportBoundary: number
        warningBlocks: number
        warningTime: number
      }
  action_bar: /** 1.17 */ {
    text: string
  }
  world_border_center: /** 1.17 */ {
    x: number
    z: number
  }
  world_border_lerp_size: /** 1.17 */
    | {
        oldDiameter: number
        newDiameter: number
        speed: any
      }
    | /** 1.19 */ {
        oldDiameter: number
        newDiameter: number
        speed: number
      }
  world_border_size: /** 1.17 */ {
    diameter: number
  }
  world_border_warning_delay: /** 1.17 */ {
    warningTime: number
  }
  world_border_warning_reach: /** 1.17 */ {
    warningBlocks: number
  }
  ping: /** 1.17 */ {
    id: number
  }
  set_title_subtitle: /** 1.17 */ {
    text: string
  }
  set_title_text: /** 1.17 */ {
    text: string
  }
  set_title_time: /** 1.17 */ {
    fadeIn: number
    stay: number
    fadeOut: number
  }
  simulation_distance: /** 1.18 */ {
    distance: number
  }
  /** Removed in 1.19.3 */
  chat_preview: /** 1.19 */ {
    queryId: number
    message: any
  }
  player_chat: /** 1.19 */
    | {
        signedChatContent: string
        unsignedChatContent: any
        type: number
        senderUuid: any
        senderName: string
        senderTeam: any
        timestamp: bigint
        salt: bigint
        signature: any
      }
    | /** 1.19.2 */ {
        previousSignature: any
        senderUuid: any
        signature: any
        plainMessage: string
        formattedMessage: any
        timestamp: bigint
        salt: bigint
        previousMessages: any
        unsignedContent: any
        filterType: number
        filterTypeMask: any
        type: number
        networkName: string
        networkTargetName: any
      }
    | /** 1.19.3 */ {
        senderUuid: any
        index: number
        signature: any
        plainMessage: string
        timestamp: bigint
        salt: bigint
        previousMessages: any
        unsignedChatContent: any
        filterType: number
        filterTypeMask: any
        type: number
        networkName: string
        networkTargetName: any
      }
  /** Removed in 1.19.3 */
  should_display_chat_preview: /** 1.19 */ {
    should_display_chat_preview: boolean
  }
  system_chat: /** 1.19 */
    | {
        content: string
        type: number
      }
    | /** 1.19.2 */ {
        content: string
        isActionBar: boolean
      }
  server_data: /** 1.19 */
    | {
        motd: any
        icon: any
        previewsChat: boolean
      }
    | /** 1.19.2 */ {
        motd: any
        icon: any
        previewsChat: boolean
        enforcesSecureChat: boolean
      }
    | /** 1.19.3 */ {
        motd: any
        icon: any
        enforcesSecureChat: boolean
      }
    | /** 1.19.4 */ {
        motd: string
        iconBytes: any
        enforcesSecureChat: boolean
      }
  chat_suggestions: /** 1.19.2 */ {
    action: number
    entries: any
  }
  hide_message: /** 1.19.2 */
    | {
        signature: any
      }
    | /** 1.19.3 */ {
        id: number
        signature: any
      }
  /** Removed in 1.19.3 */
  message_header: /** 1.19.2 */ {
    previousSignature: any
    senderUuid: any
    signature: any
    messageHash: any
  }
  profileless_chat: /** 1.19.3 */ {
    message: string
    type: number
    name: string
    target: any
  }
  player_remove: /** 1.19.3 */ {
    players: any
  }
  feature_flags: /** 1.19.3 */ {
    features: any
  }
  chunk_biomes: /** 1.19.4 */ {
    biomes: any
  }
  damage_event: /** 1.19.4 */ {
    entityId: number
    sourceTypeId: number
    sourceCauseId: any
    sourceDirectId: any
    sourcePosition: any
  }
  hurt_animation: /** 1.19.4 */ {
    entityId: number
    yaw: number
  }
}

type ClientOnMcProtocolEvents = ClientOnMap & {
  [x: `raw.${string}`]: any
  packet: any
  state: any
}

export declare const clientOn: <T extends keyof ClientOnMcProtocolEvents>(
  name: T,
  callback: (data: ClientOnMcProtocolEvents[T], packetMeta: import('minecraft-protocol').PacketMeta) => void
) => void
