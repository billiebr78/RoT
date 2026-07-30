// Internal game types shared between GameLoop and extracted modules.

export type AIState = 'IDLE' | 'ADVANCE' | 'PREPARE' | 'ATTACK' | 'RETREAT' | 'COOLDOWN' | 'STUNNED' | 'DEFENDING' | 'CASTING' | 'HEALING' | 'FLEEING';
export type PlayerState = 'IDLE' | 'MOVING' | 'ATTACKING' | 'DEFENDING' | 'CASTING';

export interface Projectile {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    owner: 'player' | 'enemy';
    damage: number;
    isCrit: boolean;
    color: string;
    size: number;
    effectType?: string;
    life: number;
}

export interface VisualEffect {
    id: number;
    type: 'SLASH' | 'IMPACT' | 'SMASH' | 'SPIN' | 'BUFF' | 'THRUST';
    x: number;
    y: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
}

export interface FloatingText {
    id: number;
    x: number;
    y: number;
    text: string;
    color: string;
    life: number;
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
}

// The mutable game state object held in a ref inside GameLoop.
export interface GameState {
    playerX: number;
    playerHp: number;
    playerMaxHp: number;
    playerState: PlayerState;
    playerVx: number;
    attackTimer: number;
    attackDuration: number;

    castTimer: number;
    castTotalTime: number;
    pendingAbilityId: string | null;

    enemy: import('../types').Enemy | null;
    enemyX: number;
    enemyVx: number;
    enemyAI: {
        state: AIState;
        timer: number;
        abilityToCast: import('../types').EnemyAbility | null;
        isPursuing: boolean; // For Defender/Berzerker pursue chance rolls
    };

    impactTimer: number;
    lastTime: number;
    keys: Record<string, boolean>;
    cooldowns: Record<string, number>;
    usable1Cd: number;
    usable2Cd: number;
    potionGlobalCd: number;

    floatingTexts: FloatingText[];
    particles: Particle[];
    projectiles: Projectile[];
    vfx: VisualEffect[];
    activeBuffs: import('../types').Buff[];

    stage: number;
    isPaused: boolean;
    goldGained: number;
    expGained: number;
    lootFound: import('../types').Item[];
    animFrame: number;
    parallaxOffset: number;
    currentAttackSpeed: number;
    cachedTotalStats: Record<import('../types').Attribute, number> | null;
    enemyAbilityCooldowns: Record<string, number>;
    // Pre-computed palette for the current enemy: hueShift + boss darken
    // baked in. Recomputed once per spawnEnemy() call so the per-frame
    // drawSprite loop does zero color math (just dict lookups).
    enemyPaletteCache: Record<string, string> | null;
    // Camera x-offset (world-space left edge of the visible viewport).
    // Calculated each frame from playerX, clamped to [0, ARENA_WIDTH - CANVAS_WIDTH].
    cameraX: number;
    // Player flee countdown in ms. -1 = not in flee zone. When in the
    // left flee zone (playerX <= FLEE_ZONE_WIDTH), counts down from 10000.
    // Reaching 0 triggers handleFlee(). Leaving the zone resets to -1.
    fleeCountdown: number;
}
