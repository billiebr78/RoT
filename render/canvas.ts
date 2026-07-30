// Canvas rendering: background, sprites, and effects.
// All functions are pure — they take ctx + state and draw, no side effects.

import { SPRITE_LIBRARY } from '../constants';
import type { Character, Attribute } from '../types';
import type { GameState, PlayerState, AIState } from '../game/types';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const GROUND_Y = 480;

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
    for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
        const ratio = y / CANVAS_HEIGHT;
        ctx.fillStyle = ratio < 0.3 ? '#0f172a' : ratio < 0.6 ? '#1e293b' : '#334155';
        ctx.fillRect(0, y, CANVAS_WIDTH, 4);
    }
    drawHills(ctx, state.parallaxOffset, GROUND_Y);
    ctx.fillStyle = '#27272a';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    ctx.fillStyle = '#3f3f46';
    for (let i = 0; i < 30; i++) {
        const rx = (state.animFrame * 2 + i * 50) % CANVAS_WIDTH;
        ctx.fillRect(rx, GROUND_Y + 4 + (i % 3) * 4, 8, 4);
    }
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
        darken?: number;          // 0-1, multiplies all RGB by (1-darken)
        paletteOverride?: Partial<Record<string, string>>;  // merge over sprite palette
        hueShift?: number;        // degrees, rotates hue of every non-grey color
    },
) => {
    const sprite = SPRITE_LIBRARY[spriteKey] || SPRITE_LIBRARY['goblin'];
    if (!sprite) return;
    const { rows, palette } = sprite;

    const darken = options?.darken ?? 0;
    const paletteOverride = options?.paletteOverride;
    const hueShift = options?.hueShift ?? 0;

    let animRowIndex = 0;
    if (spriteKey === characterClassType) {
        if (state.playerState === 'ATTACKING') animRowIndex = 2;
        else if (state.playerState === 'MOVING') animRowIndex = 1;
        else if (state.playerState === 'DEFENDING' || state.playerState === 'CASTING') animRowIndex = 3;
        else animRowIndex = 0;
    }

    let frameOffset = 0;
    if (state.playerState === 'ATTACKING' && spriteKey === characterClassType) {
        const duration = state.attackDuration || 300;
        const progress = 1 - (state.attackTimer / duration);
        if (progress < 0.3) frameOffset = 0;
        else if (progress < 0.6) frameOffset = 1;
        else frameOffset = 2;
    } else if (state.playerState === 'MOVING' || state.enemyAI.state === 'ADVANCE') {
        frameOffset = (frame % 3);
    } else {
        frameOffset = (Math.floor(frame / 10) % 3);
    }

    const frameHeight = 16;
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
        const frameStart = frameOffset * 12;
        const rowStr = fullRowStr.slice(frameStart, frameStart + 12);
        for (let c = 0; c < 12; c++) {
            const char = rowStr[c];
            // overrideColor (status effect tint like stun/defend) takes
            // precedence over palette. Otherwise use paletteOverride if
            // provided, falling back to the sprite's base palette.
            let color: string | undefined;
            if (overrideColor) {
                color = overrideColor;
            } else {
                color = (paletteOverride && paletteOverride[char]) || palette[char];
            }
            if (color && color !== 'transparent') {
                // Hue shift is applied first (rotates the base color),
                // then darken (multiplies RGB down). Both are no-ops when
                // their respective factor is 0.
                if (hueShift !== 0) color = shiftHue(color, hueShift);
                if (darken > 0) color = darkenColor(color, darken);
                ctx.fillStyle = color;
                const dx = (c - 6) * scale;
                const dy = (r - 16) * scale;
                ctx.fillRect(dx, dy, scale, scale);
            }
        }
    }
    ctx.restore();
};

export const drawEffects = (ctx: CanvasRenderingContext2D, state: GameState) => {
    // Projectiles
    state.projectiles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
    });

    // VFX
    state.vfx.forEach(v => {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
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
        ctx.restore();
    });

    // Particles
    state.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 20;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1.0;
    });

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
export const draw = (
    ctx: CanvasRenderingContext2D,
    state: GameState,
    character: Character,
) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawBackground(ctx, state);

    if (state.enemy && state.enemyX > CANVAS_WIDTH - 50) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(Math.sin(state.animFrame * 0.1))})`;
        ctx.font = "bold 20px monospace";
        ctx.fillText("ENEMY ->", CANVAS_WIDTH - 100, GROUND_Y - 20);
    }

    const playerSprite = character.classType;
    let playerColorOverride: string | undefined;
    if (state.playerState === 'DEFENDING') playerColorOverride = '#3b82f6';
    if (state.castTimer > 0) playerColorOverride = '#eab308';
    drawSprite(ctx, playerSprite, state.playerX, GROUND_Y - 10, 5, true, state.animFrame, playerColorOverride, state, character.classType);

    if (state.castTimer > 0) {
        const castPct = 1 - (state.castTimer / state.castTotalTime);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(state.playerX - 20, GROUND_Y - 100, 40, 6);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(state.playerX - 20, GROUND_Y - 100, 40 * castPct, 6);
    }

    if (state.playerState === 'DEFENDING') {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(state.playerX, GROUND_Y - 40, 30, 0, Math.PI * 2); ctx.stroke();
    }

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

    if (state.enemy) {
        const aiState = state.enemyAI.state;
        let enemyColor: string | undefined;
        if (aiState === 'STUNNED') enemyColor = '#555';
        if (aiState === 'DEFENDING') enemyColor = '#b91c1c';
        // Bosses are drawn 80% darker to visually distinguish them as tougher
        // foes. The darken factor is applied to every pixel of the sprite,
        // including the status-effect overrideColor (so a stunned boss stays
        // darker than a stunned normal enemy).
        // The enemy's random hueShift (set at spawn time in generateEnemy)
        // rotates every non-grey color by up to ±90° (±25% of the wheel),
        // giving each spawned enemy a unique tint without changing its
        // sprite definition. Outlines and shadows (pure greys with s=0)
        // are left untouched by shiftHue so they stay neutral.
        drawSprite(
            ctx, state.enemy.sprite, state.enemyX, GROUND_Y - 10,
            state.enemy.isBoss ? 7 : 5, false, state.animFrame, enemyColor,
            state, character.classType,
            {
                darken: state.enemy.isBoss ? 0.8 : 0,
                hueShift: state.enemy.hueShift ?? 0,
            },
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
    }

    drawEffects(ctx, state);
};

export { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y };
