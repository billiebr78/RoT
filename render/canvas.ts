// Canvas rendering: background, sprites, and effects.
// All functions are pure — they take ctx + state and draw, no side effects.

import { SPRITE_LIBRARY } from '../constants';
import type { Character, Attribute } from '../types';
import type { GameState, PlayerState, AIState } from '../game/types';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const GROUND_Y = 480;

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
) => {
    const sprite = SPRITE_LIBRARY[spriteKey] || SPRITE_LIBRARY['goblin'];
    if (!sprite) return;
    const { rows, palette } = sprite;

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
            const color = overrideColor || palette[char];
            if (color && color !== 'transparent') {
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
        drawSprite(ctx, state.enemy.sprite, state.enemyX, GROUND_Y - 10, state.enemy.isBoss ? 7 : 5, false, state.animFrame, enemyColor, state, character.classType);

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
