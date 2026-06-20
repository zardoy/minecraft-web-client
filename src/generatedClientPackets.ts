export interface ClientWriteMap {
  keep_alive: /** 1.7 */
    | {
        keepAliveId: number
      }
    | /** 1.12.2 */ {
        keepAliveId: bigint
      }
  /** Removed in 1.19 */
  chat: /** 1.7 */ {
    message: string
  }
  use_entity: /** 1.7 */
    | {
        target: number
        mouse: number
        x: any
        y: any
        z: any
      }
    | /** 1.9 */ {
        target: number
        mouse: number
        x: any
        y: any
        z: any
        hand: any
      }
    | /** 1.16 */ {
        target: number
        mouse: number
        x: any
        y: any
        z: any
        hand: any
        sneaking: boolean
      }
  flying: /** 1.7 */ {
    onGround: boolean
  }
  position: /** 1.7 */
    | {
        x: number
        stance: number
        y: number
        z: number
        onGround: boolean
      }
    | /** 1.8 */ {
        x: number
        y: number
        z: number
        onGround: boolean
      }
  look: /** 1.7 */ {
    yaw: number
    pitch: number
    onGround: boolean
  }
  position_look: /** 1.7 */
    | {
        x: number
        stance: number
        y: number
        z: number
        yaw: number
        pitch: number
        onGround: boolean
      }
    | /** 1.8 */ {
        x: number
        y: number
        z: number
        yaw: number
        pitch: number
        onGround: boolean
      }
  block_dig: /** 1.7 */
    | {
        status: number
        location: any
        face: number
      }
    | /** 1.8 */ {
        status: number
        location: { x: number; y: number; z: number }
        face: number
      }
    | /** 1.19 */ {
        status: number
        location: { x: number; y: number; z: number }
        face: number
        sequence: number
      }
  block_place: /** 1.7 */
    | {
        location: any
        direction: number
        heldItem: any
        cursorX: number
        cursorY: number
        cursorZ: number
      }
    | /** 1.8 */ {
        location: { x: number; y: number; z: number }
        direction: number
        heldItem: any
        cursorX: number
        cursorY: number
        cursorZ: number
      }
    | /** 1.9 */ {
        location: { x: number; y: number; z: number }
        direction: number
        hand: number
        cursorX: number
        cursorY: number
        cursorZ: number
      }
    | /** 1.14 */ {
        hand: number
        location: { x: number; y: number; z: number }
        direction: number
        cursorX: number
        cursorY: number
        cursorZ: number
        insideBlock: boolean
      }
    | /** 1.19 */ {
        hand: number
        location: { x: number; y: number; z: number }
        direction: number
        cursorX: number
        cursorY: number
        cursorZ: number
        insideBlock: boolean
        sequence: number
      }
  held_item_slot: /** 1.7 */ {
    slotId: number
  }
  arm_animation: /** 1.7 */
    | {
        entityId: number
        animation: number
      }
    | /** 1.8 */ {}
    | /** 1.9 */ {
        hand: number
      }
  entity_action: /** 1.7 */ {
    entityId: number
    actionId: number
    jumpBoost: number
  }
  steer_vehicle: /** 1.7 */
    | {
        sideways: number
        forward: number
        jump: boolean
        unmount: boolean
      }
    | /** 1.8 */ {
        sideways: number
        forward: number
        jump: number
      }
  close_window: /** 1.7 */ {
    windowId: number
  }
  window_click: /** 1.7 */
    | {
        windowId: number
        slot: number
        mouseButton: number
        action: number
        mode: number
        item: any
      }
    | /** 1.17 */ {
        windowId: number
        slot: number
        mouseButton: number
        mode: number
        changedSlots: any
        cursorItem: any
      }
    | /** 1.17.1 */ {
        windowId: number
        stateId: number
        slot: number
        mouseButton: number
        mode: number
        changedSlots: any
        cursorItem: any
      }
  /** Removed in 1.17 */
  transaction: /** 1.7 */ {
    windowId: number
    action: number
    accepted: boolean
  }
  set_creative_slot: /** 1.7 */ {
    slot: number
    item: any
  }
  enchant_item: /** 1.7 */ {
    windowId: number
    enchantment: number
  }
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
    | /** 1.20 */ {
        location: { x: number; y: number; z: number }
        isFrontText: boolean
        text1: string
        text2: string
        text3: string
        text4: string
      }
  abilities: /** 1.7 */
    | {
        flags: number
        flyingSpeed: number
        walkingSpeed: number
      }
    | /** 1.16 */ {
        flags: number
      }
  tab_complete: /** 1.7 */
    | {
        text: string
      }
    | /** 1.8 */ {
        text: string
        block: any
      }
    | /** 1.9 */ {
        text: string
        assumeCommand: boolean
        lookedAtBlock: any
      }
    | /** 1.13 */ {
        transactionId: number
        text: string
      }
  settings: /** 1.7 */
    | {
        locale: string
        viewDistance: number
        chatFlags: number
        chatColors: boolean
        difficulty: number
        showCape: boolean
      }
    | /** 1.8 */ {
        locale: string
        viewDistance: number
        chatFlags: number
        chatColors: boolean
        skinParts: number
      }
    | /** 1.9 */ {
        locale: string
        viewDistance: number
        chatFlags: number
        chatColors: boolean
        skinParts: number
        mainHand: number
      }
    | /** 1.17 */ {
        locale: string
        viewDistance: number
        chatFlags: number
        chatColors: boolean
        skinParts: number
        mainHand: number
        disableTextFiltering: boolean
      }
    | /** 1.18 */ {
        locale: string
        viewDistance: number
        chatFlags: number
        chatColors: boolean
        skinParts: number
        mainHand: number
        enableTextFiltering: boolean
        enableServerListing: boolean
      }
  client_command: /** 1.7 */
    | {
        payload: number
      }
    | /** 1.9 */ {
        actionId: number
      }
  custom_payload: /** 1.7 */ {
    channel: string
    data: any
  }
  packet: /** 1.7 */ {
    name: any
    params: any
  }
  spectate: /** 1.8 */ {
    target: any
  }
  resource_pack_receive: /** 1.8 */
    | {
        hash: string
        result: number
      }
    | /** 1.10 */ {
        result: number
      }
    | /** 1.20.3 */ {
        uuid: any
        result: number
      }
  teleport_confirm: /** 1.9 */ {
    teleportId: number
  }
  vehicle_move: /** 1.9 */ {
    x: number
    y: number
    z: number
    yaw: number
    pitch: number
  }
  steer_boat: /** 1.9 */ {
    leftPaddle: boolean
    rightPaddle: boolean
  }
  use_item: /** 1.9 */
    | {
        hand: number
      }
    | /** 1.19 */ {
        hand: number
        sequence: number
      }
  /** Removed in 1.12.1 */
  prepare_crafting_grid: /** 1.12 */ {
    windowId: number
    actionNumber: number
    returnEntry: any
    prepareEntry: any
  }
  /** Removed in 1.16.2 */
  crafting_book_data: /** 1.12 */ {
    type: number
    undefined: any
  }
  advancement_tab: /** 1.12 */ {
    action: number
    tabId: any
  }
  craft_recipe_request: /** 1.12.1 */
    | {
        windowId: number
        recipe: number
        makeAll: boolean
      }
    | /** 1.13 */ {
        windowId: number
        recipe: string
        makeAll: boolean
      }
  query_block_nbt: /** 1.13 */ {
    transactionId: number
    location: { x: number; y: number; z: number }
  }
  edit_book: /** 1.13 */
    | {
        new_book: any
        signing: boolean
      }
    | /** 1.13.1 */ {
        new_book: any
        signing: boolean
        hand: number
      }
    | /** 1.17.1 */ {
        hand: number
        pages: any
        title: any
      }
  query_entity_nbt: /** 1.13 */ {
    transactionId: number
    entityId: number
  }
  pick_item: /** 1.13 */ {
    slot: number
  }
  name_item: /** 1.13 */ {
    name: string
  }
  select_trade: /** 1.13 */ {
    slot: number
  }
  set_beacon_effect: /** 1.13 */
    | {
        primary_effect: number
        secondary_effect: number
      }
    | /** 1.19 */ {
        primary_effect: any
        secondary_effect: any
      }
  update_command_block: /** 1.13 */ {
    location: { x: number; y: number; z: number }
    command: string
    mode: number
    flags: number
  }
  update_command_block_minecart: /** 1.13 */ {
    entityId: number
    command: string
    track_output: boolean
  }
  update_structure_block: /** 1.13 */
    | {
        location: { x: number; y: number; z: number }
        action: number
        mode: number
        name: string
        offset_x: number
        offset_y: number
        offset_z: number
        size_x: number
        size_y: number
        size_z: number
        mirror: number
        rotation: number
        metadata: string
        integrity: number
        seed: any
        flags: number
      }
    | /** 1.19 */ {
        location: { x: number; y: number; z: number }
        action: number
        mode: number
        name: string
        offset_x: number
        offset_y: number
        offset_z: number
        size_x: number
        size_y: number
        size_z: number
        mirror: number
        rotation: number
        metadata: string
        integrity: number
        seed: number
        flags: number
      }
  set_difficulty: /** 1.14 */ {
    newDifficulty: number
  }
  lock_difficulty: /** 1.14 */ {
    locked: boolean
  }
  update_jigsaw_block: /** 1.14 */
    | {
        location: { x: number; y: number; z: number }
        attachmentType: string
        targetPool: string
        finalState: string
      }
    | /** 1.16 */ {
        location: { x: number; y: number; z: number }
        name: string
        target: string
        pool: string
        finalState: string
        jointType: string
      }
    | /** 1.20.3 */ {
        location: { x: number; y: number; z: number }
        name: string
        target: string
        pool: string
        finalState: string
        jointType: string
        selection_priority: number
        placement_priority: number
      }
  generate_structure: /** 1.16 */ {
    location: { x: number; y: number; z: number }
    levels: number
    keepJigsaws: boolean
  }
  displayed_recipe: /** 1.16.2 */ {
    recipeId: string
  }
  recipe_book: /** 1.16.2 */ {
    bookId: number
    bookOpen: boolean
    filterActive: boolean
  }
  pong: /** 1.17 */ {
    id: number
  }
  chat_command: /** 1.19 */
    | {
        command: string
        timestamp: bigint
        salt: bigint
        argumentSignatures: any
        signedPreview: boolean
      }
    | /** 1.19.2 */ {
        command: string
        timestamp: bigint
        salt: bigint
        argumentSignatures: any
        signedPreview: boolean
        previousMessages: any
        lastRejectedMessage: any
      }
    | /** 1.19.3 */ {
        command: string
        timestamp: bigint
        salt: bigint
        argumentSignatures: any
        messageCount: number
        acknowledged: any
      }
  chat_message: /** 1.19 */
    | {
        message: string
        timestamp: bigint
        salt: bigint
        signature: any
        signedPreview: boolean
      }
    | /** 1.19.2 */ {
        message: string
        timestamp: bigint
        salt: bigint
        signature: any
        signedPreview: boolean
        previousMessages: any
        lastRejectedMessage: any
      }
    | /** 1.19.3 */ {
        message: string
        timestamp: bigint
        salt: bigint
        signature: any
        offset: number
        acknowledged: any
      }
  /** Removed in 1.19.3 */
  chat_preview: /** 1.19 */ {
    query: number
    message: string
  }
  message_acknowledgement: /** 1.19.2 */
    | {
        previousMessages: any
        lastRejectedMessage: any
      }
    | /** 1.19.3 */ {
        count: number
      }
  chat_session_update: /** 1.19.3 */ {
    sessionUUID: any
    expireTime: bigint
    publicKey: any
    signature: any
  }
  chunk_batch_received: /** 1.20.2 */ {
    chunksPerTick: number
  }
  /** Removed in 1.20.3 */
  configuation_acknowledged: /** 1.20.2 */ {}
  ping_request: /** 1.20.2 */ {
    id: bigint
  }
  configuration_acknowledged: /** 1.20.3 */ {}
  set_slot_state: /** 1.20.3 */ {
    slot_id: number
    window_id: number
    state: boolean
  }
}

export declare const clientWrite: <T extends keyof ClientWriteMap>(name: T, data: ClientWriteMap[T]) => Buffer
