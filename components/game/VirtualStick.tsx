import React, { useRef, useState, useCallback } from 'react';

interface Props {
    onMoveLeft: (pressed: boolean) => void;
    onMoveRight: (pressed: boolean) => void;
}

/**
 * Virtual horizontal joystick for touch-based movement.
 *
 * Replaces the two-button (◄ ►) layout with a single draggable stick
 * that snaps back to center when released. Drag left → move left,
 * drag right → move right. There's a deadzone in the center so small
 * touches don't trigger movement.
 *
 * Pointer events are used (works for both touch and mouse). The stick
 * only responds to horizontal drag — vertical movement is ignored to
 * avoid conflicts with page scroll on mobile.
 *
 * MULTITOUCH SUPPORT: tracks the specific pointerId that started the
 * drag, so a second finger touching the attack button (or any other
 * element) doesn't interfere with the joystick. Each pointer is
 * independent — the joystick only responds to its own pointer's move
 * and up events. This is critical for mobile play where the player
 * needs to move and attack simultaneously.
 *
 * Visual: a circular base with a smaller "knob" inside that follows
 * the pointer. The knob is clamped to the base radius and snaps back
 * to center on release with a CSS transition.
 */
const VirtualStick: React.FC<Props> = ({ onMoveLeft, onMoveRight }) => {
    const baseRef = useRef<HTMLDivElement>(null);
    const [knobX, setKnobX] = useState(0); // -1 to 1 (left to right)
    const [isDragging, setIsDragging] = useState(false);
    // Track the specific pointerId that started the drag. This is
    // critical for multitouch — without it, a second finger on the
    // attack button would fire pointermove events on the joystick
    // too, causing erratic knob movement. By tracking the pointerId,
    // we only respond to events from the finger that started the drag.
    const dragPointerId = useRef<number | null>(null);
    // Track current move state so we only fire callbacks on transitions
    // (avoids spamming onMoveLeft(true) every pointermove event).
    const currentDir = useRef<'left' | 'right' | 'idle'>('idle');
    // Track pointer offset from knob center at drag start so the knob
    // doesn't jump to the pointer position when you grab it off-center.
    const grabOffset = useRef(0);

    const DEADZONE = 0.25; // 25% of radius — below this, no movement

    const updateMoveState = useCallback((normalizedX: number) => {
        let newDir: 'left' | 'right' | 'idle';
        if (normalizedX < -DEADZONE) {
            newDir = 'left';
        } else if (normalizedX > DEADZONE) {
            newDir = 'right';
        } else {
            newDir = 'idle';
        }
        if (newDir !== currentDir.current) {
            // Transition — fire callbacks to update movement state
            if (newDir === 'left') {
                onMoveLeft(true);
                onMoveRight(false);
            } else if (newDir === 'right') {
                onMoveRight(true);
                onMoveLeft(false);
            } else {
                // idle — release both
                onMoveLeft(false);
                onMoveRight(false);
            }
            currentDir.current = newDir;
        }
    }, [onMoveLeft, onMoveRight]);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        // If already dragging with another pointer, ignore this one.
        // This shouldn't normally happen because pointer capture routes
        // events to the capturing element, but it's a safety check.
        if (dragPointerId.current !== null) return;
        const base = baseRef.current;
        if (!base) return;
        // Capture THIS specific pointer so we keep getting its move/up
        // events even if it leaves the base element. Other pointers
        // (e.g. a finger on the attack button) are unaffected.
        base.setPointerCapture(e.pointerId);
        dragPointerId.current = e.pointerId;
        setIsDragging(true);
        // Calculate where the user grabbed relative to knob center.
        // This makes the knob "follow" the pointer naturally instead
        // of jumping to center under the finger.
        const rect = base.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        grabOffset.current = (e.clientX - centerX) / (rect.width / 2);
        // Clamp initial offset to [-1, 1]
        grabOffset.current = Math.max(-1, Math.min(1, grabOffset.current));
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        // Only respond to the pointer that started the drag. This is
        // the key fix for multitouch — without this check, a second
        // finger on another element (attack button, ability button)
        // would fire pointermove events here because of event bubbling,
        // causing the knob to jump erratically.
        if (dragPointerId.current !== e.pointerId) return;
        const base = baseRef.current;
        if (!base) return;
        const rect = base.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        // Normalize pointer position to [-1, 1] relative to base center
        const rawX = (e.clientX - centerX) / (rect.width / 2);
        // Subtract grab offset so the knob moves with the pointer
        const normalizedX = Math.max(-1, Math.min(1, rawX - grabOffset.current));
        setKnobX(normalizedX);
        updateMoveState(normalizedX);
    }, [updateMoveState]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        // Only release if this is the pointer that started the drag.
        // A pointerup from a different finger (e.g. releasing the
        // attack button) should NOT release the joystick.
        if (dragPointerId.current !== e.pointerId) return;
        const base = baseRef.current;
        if (base) {
            try { base.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
        }
        dragPointerId.current = null;
        setIsDragging(false);
        setKnobX(0);
        // Release movement
        if (currentDir.current !== 'idle') {
            onMoveLeft(false);
            onMoveRight(false);
            currentDir.current = 'idle';
        }
    }, [onMoveLeft, onMoveRight]);

    return (
        <div
            ref={baseRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative shrink-0 bg-medieval-900/80 border-2 border-medieval-600 rounded-full flex items-center justify-center touch-none select-none shadow-lg"
            style={{
                width: 'clamp(120px, 28vmin, 180px)',
                height: 'clamp(60px, 14vmin, 90px)',
                borderRadius: '9999px',
            }}
            aria-label="Movement joystick — drag left or right"
        >
            {/* Direction hint arrows (subtle, dimmed) */}
            <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none opacity-30">
                <span style={{ fontSize: 'clamp(20px, 5vmin, 32px)' }}>◄</span>
                <span style={{ fontSize: 'clamp(20px, 5vmin, 32px)' }}>►</span>
            </div>

            {/* Center marker (where the knob rests when idle) */}
            <div
                className="absolute pointer-events-none opacity-20"
                style={{
                    width: '2px',
                    height: '60%',
                    backgroundColor: '#b39263',
                }}
            />

            {/* The draggable knob */}
            <div
                className="absolute bg-medieval-400 border-2 border-medieval-200 rounded-full shadow-md"
                style={{
                    width: 'clamp(48px, 11vmin, 72px)',
                    height: 'clamp(48px, 11vmin, 72px)',
                    // Position the knob: translateX moves it left/right
                    // based on knobX (-1 to 1). The max travel is clamped
                    // to ~80% of the base radius so the knob never exits
                    // the base visually.
                    transform: `translateX(${knobX * 45}%)`,
                    transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                    backgroundColor: knobX < 0 ? '#9ca3af' : knobX > 0 ? '#9ca3af' : '#b39263',
                    // Highlight when active
                    boxShadow: isDragging
                        ? '0 0 12px rgba(212, 185, 133, 0.6)'
                        : '0 2px 6px rgba(0, 0, 0, 0.4)',
                }}
            />
        </div>
    );
};

export default VirtualStick;
