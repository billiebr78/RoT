// Canvas rendering: background, sprites, and effects.
// All functions are pure — they take ctx + state and draw, no side effects.

import { SPRITE_LIBRARY } from '../constants';
import type { Character, Attribute } from '../types';
import type { GameState, PlayerState, AIState } from '../game/types';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const GROUND_Y = 480;

// Arena is wider than the canvas (Street Fighter style). Camera follows
// the player, clamped to arena bounds. Both player and enemy can retreat
// into their respective flee zones at the arena edges.
export const ARENA_WIDTH = 1344;
export const FLEE_ZONE_WIDTH = 60; // 1 character width (60px)
export const PLAYER_SPAWN_X = 200;
export const ENEMY_SPAWN_X = 1144; // symmetric: 200 from right wall

/**
 * Darken a hex color by a factor (0 = no change, 1 = pure black).
 * Used for the boss shadow effect: bosses are drawn 80% darker than
 * normal enemies to make them visually distinct as tougher foes.
 *
 * Returns the original color if it's not a valid #RRGGBB hex.
 */
const darkenColor = (hex: string, factor: number): string => {
    if (!hex || !hex.startsWith('#') || hex.length !== 7) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const mult = Math.max(0, 1 - factor);
    const dr = Math.floor(r * mult);
    const dg = Math.floor(g * mult);
    const db = Math.floor(b * mult);
    return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
};

/**
 * Convert a hex color to HSL components (h, s, l all in 0-1 range).
 */
const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h, s, l };
};

const hueToRgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
};

const hslToHex = (h: number, s: number, l: number): string => {
    const r = s === 0 ? l : hueToRgb(l < 0.5 ? l * (1 + s) : l + s - l * s, l, h + 1 / 3);
    const g = s === 0 ? l : hueToRgb(l < 0.5 ? l * (1 + s) : l + s - l * s, l, h);
    const b = s === 0 ? l : hueToRgb(l < 0.5 ? l * (1 + s) : l + s - l * s, l, h - 1 / 3);
    const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Shift a hex color's hue by `shift` (in degrees, 0-360).
 * Positive shifts move warm colors cooler, cool colors warmer, etc.
 * Used to give each player character a unique color tint without
 * changing the sprite's pixel definition.
 *
 * Returns the original color unchanged for non-hex inputs or for
 * pure greyscale colors (h is undefined when s=0).
 */
export const shiftHue = (hex: string, shiftDeg: number): string => {
    if (!hex || !hex.startsWith('#') || hex.length !== 7) return hex;
    const { h, s, l } = hexToHsl(hex);
    // Pure greyscale (s === 0) has no hue to shift; leave it alone so
    // outlines and shadows stay neutral.
    if (s === 0) return hex;
    const shift = shiftDeg / 360;
    const newH = (h + shift + 1) % 1;
    return hslToHex(newH, s, l);
};

/**
 * Generate a random hue shift in degrees, capped at ±maxPercent of
 * the full 360° hue wheel. With maxPercent=25 the shift is in
 * [-90°, +90°]. Used once per character creation and persisted to
 * localStorage so the same character always renders the same tint.
 */
export const randomHueShift = (maxPercent: number = 25): number => {
    const maxDeg = (maxPercent / 100) * 360;
    return (Math.random() * 2 - 1) * maxDeg;
};

/**
 * Pre-compute a shifted+darkened palette for an enemy. Called ONCE
 * per spawnEnemy() so the per-frame drawSprite loop does zero color
 * math — just dict lookups via paletteOverride.
 *
 * Returns null if neither hueShift nor darken would have any effect,
 * so the caller can skip passing paletteOverride and let drawSprite
 * use the sprite's base palette directly.
 */
export const buildEnemyPalette = (
    basePalette: Record<string, string>,
    hueShift: number,
    darken: number,
): Record<string, string> | null => {
    if (!hueShift && !darken) return null;
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(basePalette)) {
        let c = v;
        if (hueShift) c = shiftHue(c, hueShift);
        if (darken) c = darkenColor(c, darken);
        result[k] = c;
    }
    return result;
};

// --- Background caching ---
// The sky gradient + ground are static (parallaxOffset only moves the
// hills, which we redraw each frame). Drawing 135 horizontal fillRects
// for the gradient every frame is wasteful on low-end devices.
// Render the static parts once into an offscreen canvas and just blit it.
let bgCache: HTMLCanvasElement | null = null;

const getBackgroundCache = (): HTMLCanvasElement => {
    if (bgCache) return bgCache;
    const c = document.createElement('canvas');
    c.width = CANVAS_WIDTH;
    c.height = CANVAS_HEIGHT;
    const cx = c.getContext('2d');
    if (!cx) return c;
    // Sky gradient (3 bands)
    for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
        const ratio = y / CANVAS_HEIGHT;
        cx.fillStyle = ratio < 0.3 ? '#0f172a' : ratio < 0.6 ? '#1e293b' : '#334155';
        cx.fillRect(0, y, CANVAS_WIDTH, 4);
    }
    // Ground
    cx.fillStyle = '#27272a';
    cx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    bgCache = c;
    return c;
};

export const drawHills = (ctx: CanvasRenderingContext2D, offset: number, groundY: number) => {
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = 0; x <= CANVAS_WIDTH; x += 10) {
        ctx.lineTo(x, groundY - 100 - Math.sin((x + offset * 0.5) * 0.01) * 50);
    }
    ctx.lineTo(CANVAS_WIDTH, groundY);
    ctx.lineTo(0, groundY);
    ctx.fill();

    ctx.fillStyle = '#312e81';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let x = 0; x <= CANVAS_WIDTH; x += 10) {
        ctx.lineTo(x, groundY - 50 - Math.sin((x + offset) * 0.02) * 30);
    }
    ctx.lineTo(CANVAS_WIDTH, groundY);
    ctx.lineTo(0, groundY);
    ctx.fill();
};

export const drawBackground = (ctx: CanvasRenderingContext2D, state: GameState) => {
    // Blit cached sky+ground (1 drawImage instead of 135 fillRects)
    ctx.drawImage(getBackgroundCache(), 0, 0);
    // Hills scroll with parallax — redraw each frame (only 2 paths)
    drawHills(ctx, state.parallaxOffset, GROUND_Y);
    // Ground texture pebbles — scroll with animFrame
    ctx.fillStyle = '#3f3f46';
    for (let i = 0; i < 30; i++) {
        const rx = (state.animFrame * 2 + i * 50) % CANVAS_WIDTH;
        ctx.fillRect(rx, GROUND_Y + 4 + (i % 3) * 4, 8, 4);
    }
};

// Hard cap on particles to prevent runaway counts during sustained combat.
export const MAX_PARTICLES = 100;

// Target on-screen height in pixels for sprites. The renderer picks the
// scale per-sprite so that:
//   scale = TARGET_PX_HEIGHT / sprite.height
//
// This keeps the on-screen size constant regardless of the sprite's grid
// resolution. A legacy 12×16 sprite and a new 32×32 sprite both end up
// the same pixel size on screen — the 32×32 just has more detail.
//
// Bosses use TARGET_PX_HEIGHT_BOSS (≈1.4× taller).
const TARGET_PX_HEIGHT = 80;
const TARGET_PX_HEIGHT_BOSS = 112;

/**
 * Compute the canvas scale to apply for a sprite of the given (grid) height
 * so that it renders at the standard on-screen pixel height.
 */
const spriteScale = (spriteGridHeight: number | undefined, isBoss: boolean = false): number => {
    const gridH = spriteGridHeight ?? 16;  // legacy default
    const targetPx = isBoss ? TARGET_PX_HEIGHT_BOSS : TARGET_PX_HEIGHT;
    return targetPx / gridH;
};

export const drawSprite = (
    ctx: CanvasRenderingContext2D,
    spriteKey: string,
    x: number,
    y: number,
    scale: number,
    facingRight: boolean,
    frame: number,
    overrideColor: string | undefined,
    state: GameState,
    characterClassType: string,
    options?: {
        paletteOverride?: Partial<Record<string, string>>;  // merge over sprite palette
    },
) => {
    const sprite = SPRITE_LIBRARY[spriteKey] || SPRITE_LIBRARY['goblin'];
    if (!sprite) return;
    const { rows, palette } = sprite;

    // Sprite dimensions — defaults preserve legacy 12×16 behavior.
    // Newer sprites declare width/height in their JSON entry (e.g. 32×32).
    const spriteW = sprite.width ?? 12;
    const spriteH = sprite.height ?? 16;

    const paletteOverride = options?.paletteOverride;

    let animRowIndex = 0;
    if (spriteKey === characterClassType) {
        if (state.playerState === 'ATTACKING') animRowIndex = 2;
        else if (state.playerState === 'MOVING') animRowIndex = 1;
        else if (state.playerState === 'DEFENDING' || state.playerState === 'CASTING') animRowIndex = 3;
        else animRowIndex = 0;
    }

    // Determine how many animation frames are available in the row.
    // Legacy sprites: 3 frames per row (spriteW × 3 chars per row string).
    // New 32×32 enemy sprites: 6 frames in a single row.
    // Single-frame sprites: just spriteW chars per row (frameCount=1).
    const sampleRowLen = rows[0]?.length ?? spriteW;
    const frameCount = Math.max(1, Math.floor(sampleRowLen / spriteW));

    let frameOffset = 0;
    if (spriteKey === characterClassType) {
        // Player sprite — 4 animation rows, each with frameCount frames.
        if (state.playerState === 'ATTACKING') {
            const duration = state.attackDuration || 300;
            const progress = 1 - (state.attackTimer / duration);
            if (frameCount >= 3) {
                if (progress < 0.3) frameOffset = 0;
                else if (progress < 0.6) frameOffset = 1;
                else frameOffset = 2;
            } else {
                frameOffset = Math.min(frameCount - 1, Math.floor(progress * frameCount));
            }
        } else if (state.playerState === 'MOVING') {
            frameOffset = (frame % frameCount);
        } else {
            // IDLE / DEFEND / CAST — slow cycle
            frameOffset = (Math.floor(frame / 10) % frameCount);
        }
    } else if (frameCount === 6) {
        // New 6-frame enemy layout:
        // [Idle1][Idle2][Walk][Windup][Attack1][Attack2]
        //   0      1      2     3       4        5
        const aiState = state.enemyAI.state;
        if (aiState === 'ATTACK') {
            // Rapidly alternate attack1/attack2 during the strike
            frameOffset = 4 + (Math.floor(frame / 3) % 2);
        } else if (aiState === 'PREPARE' || aiState === 'CASTING') {
            // Windup frame shown while preparing
            frameOffset = 3;
        } else if (aiState === 'ADVANCE' || aiState === 'RETREAT' || aiState === 'FLEEING') {
            // Walk alternates with windup (gives a 2-frame walk cycle
            // even though we only have 1 dedicated walk frame)
            frameOffset = (Math.floor(frame / 5) % 2 === 0) ? 2 : 3;
        } else if (aiState === 'HEALING') {
            frameOffset = 1; // idle 2 (slight variation)
        } else {
            // IDLE / STUNNED / DEFENDING / COOLDOWN — slow breathing
            // between idle1 and idle2
            frameOffset = (Math.floor(frame / 15) % 2);
        }
    } else if (frameCount === 1) {
        // Single-frame sprite (legacy enemy) — always frame 0
        frameOffset = 0;
    } else {
        // Legacy 3-frame sprite — keep old behavior for backwards compat
        if (state.playerState === 'MOVING' || state.enemyAI.state === 'ADVANCE') {
            frameOffset = (frame % frameCount);
        } else {
            frameOffset = (Math.floor(frame / 10) % frameCount);
        }
    }

    const frameHeight = spriteH;
    const yOffset = animRowIndex * frameHeight;

    ctx.save();
    ctx.translate(x, y);
    if (!facingRight) ctx.scale(-1, 1);
    if (animRowIndex === 0) {
        const bob = Math.sin(frame * 0.2) * 2;
        ctx.translate(0, bob);
    }

    for (let r = 0; r < frameHeight; r++) {
        if (yOffset + r >= rows.length) break;
        const fullRowStr = rows[yOffset + r];
        // Single-frame sprites have spriteW-char rows; multi-frame have
        // spriteW * 3 (frames concatenated horizontally). Clamp frameOffset
        // so we never slice past the end of a single-frame row (which would
        // return an empty string and make the sprite disappear — the
        // flickering bug).
        const maxFrameStart = Math.max(0, fullRowStr.length - spriteW);
        const frameStart = Math.min(frameOffset * spriteW, maxFrameStart);
        const rowStr = fullRowStr.slice(frameStart, frameStart + spriteW);
        for (let c = 0; c < spriteW; c++) {
            const char = rowStr[c];
            // overrideColor (status effect tint like stun/defend) takes
            // precedence over palette. Otherwise use paletteOverride if
            // provided, falling back to the sprite's base palette.
            const color = overrideColor
                ? overrideColor
                : (paletteOverride && paletteOverride[char]) || palette[char];
            if (color && color !== 'transparent') {
                ctx.fillStyle = color;
                // Center horizontally on (x,y), place feet at y (rows go up).
                const dx = (c - spriteW / 2) * scale;
                const dy = (r - spriteH) * scale;
                ctx.fillRect(dx, dy, scale, scale);
            }
        }
    }

    ctx.restore();
};

export const drawEffects = (ctx: CanvasRenderingContext2D, state: GameState) => {
    // Projectiles — batch with default composite op (source-over)
    state.projectiles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
    });

    // VFX — batch all under one save/restore with 'lighter' composite
    // (avoids save/restore per VFX, which was costing ~20 canvas state
    // changes per frame on busy fights).
    if (state.vfx.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        state.vfx.forEach(v => {
            ctx.globalAlpha = v.life / v.maxLife;
            if (v.type === 'SLASH') {
                ctx.strokeStyle = v.color;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(v.x, v.y, v.size, Math.PI, Math.PI * 1.8);
                ctx.stroke();
            } else if (v.type === 'THRUST') {
                ctx.strokeStyle = v.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(v.x, v.y);
                ctx.lineTo(v.x + v.size, v.y);
                ctx.stroke();
            } else if (v.type === 'SMASH') {
                ctx.fillStyle = v.color;
                ctx.beginPath();
                ctx.ellipse(v.x, v.y, v.size / 2, v.size, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (v.type === 'IMPACT') {
                ctx.fillStyle = v.color;
                ctx.beginPath();
                const spikes = 8;
                for (let i = 0; i < spikes * 2; i++) {
                    const r = (i % 2 === 0) ? v.size : v.size / 2;
                    const a = (Math.PI * i) / spikes;
                    ctx.lineTo(v.x + Math.cos(a) * r, v.y + Math.sin(a) * r);
                }
                ctx.fill();
            } else if (v.type === 'SPIN') {
                ctx.strokeStyle = v.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(v.x, v.y, v.size, v.size / 3, state.animFrame * 0.5, 0, Math.PI * 2);
                ctx.stroke();
            } else if (v.type === 'BUFF') {
                ctx.fillStyle = v.color;
                for (let i = 0; i < 3; i++) {
                    ctx.fillRect(v.x + (Math.random() - 0.5) * 20, v.y - (20 - v.life) * 3, 4, 4);
                }
            }
        });
        ctx.restore();
    }

    // Particles — batch without per-particle globalAlpha toggle (group
    // by alpha bucket instead). Capped at MAX_PARTICLES by the update
    // loop in GameLoop.
    if (state.particles.length > 0) {
        // Sort particles into buckets by approximate alpha to minimize
        // globalAlpha state changes. Most particles have life 20-35
        // so we bucket by Math.floor(life/5).
        const buckets: Record<number, typeof state.particles> = {};
        for (const p of state.particles) {
            const key = Math.floor(p.life / 5);
            if (!buckets[key]) buckets[key] = [];
            buckets[key].push(p);
        }
        for (const [key, particles] of Object.entries(buckets)) {
            ctx.globalAlpha = Math.min(1, (Number(key) * 5) / 20);
            for (const p of particles) {
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            }
        }
        ctx.globalAlpha = 1.0;
    }

    // Floating texts
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    state.floatingTexts.forEach(t => {
        ctx.fillStyle = 'black'; ctx.fillText(t.text, t.x + 2, t.y + 2);
        ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
    });
    ctx.textAlign = "left";
};

// Main draw function — orchestrates background, entities, and effects.
// The arena is wider than the canvas (ARENA_WIDTH > CANVAS_WIDTH), so a
// camera follows the player. Rendering is split into two layers:
//   1. Viewport-space: sky gradient (from cache), hills (parallax 0.5x),
//      UI overlays (enemy indicator, flee countdown).
//   2. World-space: everything else (player, enemy, projectiles, VFX,
//      particles, floating texts, flee zone markers). Shifted by -cameraX.
export const draw = (
    ctx: CanvasRenderingContext2D,
    state: GameState,
    character: Character,
) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // === Layer 1: Viewport-space background ===
    // Sky gradient + ground base from cache (1 drawImage)
    ctx.drawImage(getBackgroundCache(), 0, 0);

    // Hills with parallax (scroll at 0.5x camera speed for depth illusion)
    ctx.save();
    ctx.translate(-state.cameraX * 0.5, 0);
    drawHills(ctx, 0, GROUND_Y);
    ctx.restore();

    // === Layer 2: World-space entities (shifted by camera) ===
    ctx.save();
    ctx.translate(-state.cameraX, 0);

    // Ground pebbles at fixed world positions
    ctx.fillStyle = '#3f3f46';
    for (let i = 0; i < 40; i++) {
        ctx.fillRect(i * 50, GROUND_Y + 4 + (i % 3) * 4, 8, 4);
    }
    // Arena boundary markers — dashed vertical lines at flee zone edges
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(FLEE_ZONE_WIDTH, GROUND_Y - 120);
    ctx.lineTo(FLEE_ZONE_WIDTH, GROUND_Y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.beginPath();
    ctx.moveTo(ARENA_WIDTH - FLEE_ZONE_WIDTH, GROUND_Y - 120);
    ctx.lineTo(ARENA_WIDTH - FLEE_ZONE_WIDTH, GROUND_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Flee zone markers (world space, at arena edges)
    // Left zone (player escape) — green tint
    ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
    ctx.fillRect(0, GROUND_Y - 100, FLEE_ZONE_WIDTH, 100);
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = 'rgba(74, 222, 128, 0.7)';
    ctx.fillText("EXIT", FLEE_ZONE_WIDTH / 2, GROUND_Y - 85);
    // Right zone (enemy escape) — red tint
    ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
    ctx.fillRect(ARENA_WIDTH - FLEE_ZONE_WIDTH, GROUND_Y - 100, FLEE_ZONE_WIDTH, 100);
    ctx.fillStyle = 'rgba(248, 113, 113, 0.7)';
    ctx.fillText("EXIT", ARENA_WIDTH - FLEE_ZONE_WIDTH / 2, GROUND_Y - 85);
    ctx.textAlign = "left";

    // Player sprite
    const playerSprite = character.classType;
    let playerColorOverride: string | undefined;
    if (state.playerState === 'DEFENDING') playerColorOverride = '#3b82f6';
    if (state.castTimer > 0) playerColorOverride = '#eab308';
    drawSprite(ctx, playerSprite, state.playerX, GROUND_Y - 10,
        spriteScale(SPRITE_LIBRARY[playerSprite]?.height), true,
        state.animFrame, playerColorOverride, state, character.classType);

    // Player cast bar
    if (state.castTimer > 0) {
        const castPct = 1 - (state.castTimer / state.castTotalTime);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(state.playerX - 20, GROUND_Y - 100, 40, 6);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(state.playerX - 20, GROUND_Y - 100, 40 * castPct, 6);
    }

    // Player defend circle
    if (state.playerState === 'DEFENDING') {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(state.playerX, GROUND_Y - 40, 30, 0, Math.PI * 2); ctx.stroke();
    }

    // Player barrier
    const barrier = state.activeBuffs.find(b => b.barrierHp && b.barrierHp > 0);
    if (barrier) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.arc(state.playerX, GROUND_Y - 40, 38, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Enemy sprite
    if (state.enemy) {
        const aiState = state.enemyAI.state;
        let enemyColor: string | undefined;
        if (aiState === 'STUNNED') enemyColor = '#555';
        if (aiState === 'DEFENDING') enemyColor = '#b91c1c';
        drawSprite(
            ctx, state.enemy.sprite, state.enemyX, GROUND_Y - 10,
            spriteScale(SPRITE_LIBRARY[state.enemy.sprite]?.height, state.enemy.isBoss),
            false, state.animFrame, enemyColor,
            state, character.classType,
            { paletteOverride: state.enemyPaletteCache || undefined },
        );

        if (aiState === 'PREPARE') {
            ctx.font = "900 40px serif";
            ctx.fillStyle = "#fbbf24";
            ctx.fillText("!", state.enemyX - 10, GROUND_Y - 110 + Math.sin(state.animFrame * 0.2) * 5);
        }
        if (aiState === 'CASTING') {
            ctx.font = "900 40px serif";
            ctx.fillStyle = "#d946ef";
            ctx.fillText("✦", state.enemyX - 10, GROUND_Y - 110 + Math.sin(state.animFrame * 0.2) * 5);
        }
        if (aiState === 'HEALING') {
            // First Aid cast bar — same visual style as the player's cast bar.
            // Shows progress from 0 to 100% over the 2-second cast time.
            // Green fill to match the heal color.
            const healPct = 1 - (state.enemyAI.timer / 2000);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(state.enemyX - 20, GROUND_Y - 100, 40, 6);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(state.enemyX - 20, GROUND_Y - 100, 40 * healPct, 6);
        }
        if (aiState === 'FLEEING' && state.enemyFleeCountdown >= 0) {
            // Enemy flee countdown — small bar above the enemy showing
            // the escape timer.
            const fleePct = state.enemyFleeCountdown / 5000;
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(state.enemyX - 20, GROUND_Y - 100, 40, 4);
            ctx.fillStyle = '#f97316';
            ctx.fillRect(state.enemyX - 20, GROUND_Y - 100, 40 * fleePct, 4);
        }
        // Enemy Stone Skin indicator (gray shield outline)
        const stoneSkin = (state.enemy as any).stoneSkinTurns;
        if (stoneSkin && stoneSkin > 0) {
            ctx.strokeStyle = '#9ca3af';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 2]);
            ctx.beginPath();
            ctx.arc(state.enemyX, GROUND_Y - 40, 35, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        // Enemy Shield barrier indicator (purple outline)
        const enemyBarrier = (state.enemy as any).barrierHp;
        if (enemyBarrier && enemyBarrier > 0) {
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 2]);
            ctx.beginPath();
            ctx.arc(state.enemyX, GROUND_Y - 40, 42, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.font = "bold 10px monospace";
            ctx.fillStyle = '#c084fc';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.ceil(enemyBarrier)}`, state.enemyX, GROUND_Y - 85);
            ctx.textAlign = 'left';
        }
    }

    // Effects (projectiles, VFX, particles, floating texts) — all world-space
    drawEffects(ctx, state);

    ctx.restore();

    // === Layer 3: Viewport-space UI overlays ===
    // Enemy off-screen indicator
    if (state.enemy) {
        const visibleRight = state.cameraX + CANVAS_WIDTH;
        if (state.enemyX > visibleRight) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(Math.sin(state.animFrame * 0.1))})`;
            ctx.font = "bold 20px monospace";
            ctx.textAlign = "right";
            ctx.fillText("ENEMY →", CANVAS_WIDTH - 20, GROUND_Y - 20);
            ctx.textAlign = "left";
        } else if (state.enemyX < state.cameraX) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(Math.sin(state.animFrame * 0.1))})`;
            ctx.font = "bold 20px monospace";
            ctx.fillText("← ENEMY", 20, GROUND_Y - 20);
        }
    }

    // Flee countdown overlay
    if (state.fleeCountdown >= 0) {
        const seconds = Math.ceil(state.fleeCountdown / 1000);
        ctx.font = "bold 48px serif";
        ctx.textAlign = "center";
        ctx.fillStyle = 'black';
        ctx.fillText(`FLEEING IN ${seconds}...`, CANVAS_WIDTH / 2 + 2, CANVAS_HEIGHT / 2 + 2);
        ctx.fillStyle = seconds <= 3 ? '#ef4444' : '#facc15';
        ctx.fillText(`FLEEING IN ${seconds}...`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.textAlign = "left";
    }
};

export { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y };
