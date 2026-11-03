import React, { useRef, useState, useCallback, useEffect } from 'react';
import { calculateJoystickVector } from '../game/rules.ts';

interface MobileControlsProps {
  onMove: (x: number, y: number) => void;
  onAim: (angle: number, active: boolean, isFiring: boolean) => void;
  onFireHeld: (isFiring: boolean) => void;
  onDash: () => void;
  onToggleAutoFire: () => void;
  autoFire: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onMove,
  onAim,
  onFireHeld,
  onDash,
  onToggleAutoFire,
  autoFire,
}) => {
  // Move Stick State
  const moveBaseRef = useRef<HTMLDivElement | null>(null);
  const [moveStick, setMoveStick] = useState({ x: 0, y: 0, active: false });
  const movePointerId = useRef<number | null>(null);

  // Aim Stick State
  const aimBaseRef = useRef<HTMLDivElement | null>(null);
  const [aimStick, setAimStick] = useState({ x: 0, y: 0, active: false });
  const aimPointerId = useRef<number | null>(null);

  // Dash feedback
  const [dashPressed, setDashPressed] = useState(false);

  // ---------------------------------------------
  // MOVE STICK HANDLERS
  // ---------------------------------------------
  const handleMovePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (movePointerId.current !== null) return;
    movePointerId.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const rect = moveBaseRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rawDx = e.clientX - centerX;
    const rawDy = e.clientY - centerY;

    const vec = calculateJoystickVector(rawDx, rawDy, 48, 4);
    setMoveStick({ x: Math.cos(vec.angle) * vec.distance, y: Math.sin(vec.angle) * vec.distance, active: true });
    onMove(vec.x, vec.y);
  }, [onMove]);

  const handleMovePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== movePointerId.current) return;
    e.preventDefault();

    const rect = moveBaseRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rawDx = e.clientX - centerX;
    const rawDy = e.clientY - centerY;

    const vec = calculateJoystickVector(rawDx, rawDy, 48, 4);
    setMoveStick({
      x: vec.active ? Math.cos(vec.angle) * vec.distance : 0,
      y: vec.active ? Math.sin(vec.angle) * vec.distance : 0,
      active: vec.active,
    });
    onMove(vec.x, vec.y);
  }, [onMove]);

  const handleMovePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== movePointerId.current) return;
    e.preventDefault();
    movePointerId.current = null;
    setMoveStick({ x: 0, y: 0, active: false });
    onMove(0, 0);
  }, [onMove]);

  // ---------------------------------------------
  // AIM & SHOOT STICK HANDLERS
  // ---------------------------------------------
  const handleAimPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (aimPointerId.current !== null) return;
    aimPointerId.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const rect = aimBaseRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rawDx = e.clientX - centerX;
    const rawDy = e.clientY - centerY;

    const vec = calculateJoystickVector(rawDx, rawDy, 48, 6);
    setAimStick({ x: Math.cos(vec.angle) * vec.distance, y: Math.sin(vec.angle) * vec.distance, active: true });
    onAim(vec.angle, true, true);
  }, [onAim]);

  const handleAimPointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== aimPointerId.current) return;
    e.preventDefault();

    const rect = aimBaseRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rawDx = e.clientX - centerX;
    const rawDy = e.clientY - centerY;

    const vec = calculateJoystickVector(rawDx, rawDy, 48, 6);
    setAimStick({
      x: vec.active ? Math.cos(vec.angle) * vec.distance : 0,
      y: vec.active ? Math.sin(vec.angle) * vec.distance : 0,
      active: true,
    });
    onAim(vec.angle, true, true);
  }, [onAim]);

  const handleAimPointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== aimPointerId.current) return;
    e.preventDefault();
    aimPointerId.current = null;
    setAimStick({ x: 0, y: 0, active: false });
    onAim(0, false, false);
  }, [onAim]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      onMove(0, 0);
      onAim(0, false, false);
      onFireHeld(false);
    };
  }, [onMove, onAim, onFireHeld]);

  return (
    <div className="fixed inset-0 z-30 pointer-events-none select-none flex flex-col justify-end p-3 sm:p-6">
      <div className="flex items-end justify-between w-full">
        {/* ================= LEFT: MOVE JOYSTICK ================= */}
        <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
          <div
            ref={moveBaseRef}
            onPointerDown={handleMovePointerDown}
            onPointerMove={handleMovePointerMove}
            onPointerUp={handleMovePointerUp}
            onPointerCancel={handleMovePointerUp}
            className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-[#00FFA3]/40 bg-[#0a0b10]/80 shadow-[0_0_20px_rgba(0,255,163,0.25)] flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
          >
            {/* Crosshair guide lines */}
            <div className="absolute top-1/2 left-2 right-2 h-[1px] bg-[#00FFA3]/20 -translate-y-1/2" />
            <div className="absolute left-1/2 top-2 bottom-2 w-[1px] bg-[#00FFA3]/20 -translate-x-1/2" />

            {/* Thumb Knob */}
            <div
              className="absolute w-12 h-12 rounded-full bg-[#00FFA3] border border-white shadow-[0_0_15px_rgba(0,255,163,0.8)] transition-transform duration-75 flex items-center justify-center pointer-events-none"
              style={{
                transform: `translate(${moveStick.x}px, ${moveStick.y}px)`,
              }}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-[#0a0b10]" />
            </div>
          </div>
          <span className="text-[10px] font-cyber font-bold tracking-widest text-[#00FFA3]/80 bg-[#0a0b10]/60 px-2 py-0.5 rounded">
            MOVE THUMB
          </span>
        </div>

        {/* ================= RIGHT: COMBINED AIM/FIRE STICK & ACTION BUTTONS ================= */}
        <div className="flex items-end gap-3 pointer-events-auto">
          {/* Quick Action Buttons (DASH & AUTO-FIRE) */}
          <div className="flex flex-col gap-2.5 pb-1">
            {/* Auto-Fire Toggle Button */}
            <button
              onClick={onToggleAutoFire}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border flex flex-col items-center justify-center font-cyber font-black text-[9px] sm:text-[10px] tracking-tight shadow-md transition-all active:scale-90 cursor-pointer ${
                autoFire
                  ? 'bg-[#00FFA3] text-[#0a0b10] border-[#00FFA3] shadow-[0_0_15px_rgba(0,255,163,0.7)]'
                  : 'bg-[#12141c]/90 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
            >
              <span>AUTO</span>
              <span className="text-[8px] font-mono leading-none">{autoFire ? 'ON' : 'OFF'}</span>
            </button>

            {/* Dash Sprint Button */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                setDashPressed(true);
                onDash();
              }}
              onPointerUp={() => setDashPressed(false)}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center font-cyber font-black text-xs shadow-md transition-all active:scale-90 cursor-pointer ${
                dashPressed
                  ? 'bg-[#00FFA3] text-[#0a0b10] border-white scale-95 shadow-[0_0_20px_rgba(0,255,163,0.9)]'
                  : 'bg-[#12141c]/90 text-[#00FFA3] border-[#00FFA3]/60 hover:border-[#00FFA3]'
              }`}
            >
              DASH
            </button>
          </div>

          {/* Aim & Shoot Joystick */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              ref={aimBaseRef}
              onPointerDown={handleAimPointerDown}
              onPointerMove={handleAimPointerMove}
              onPointerUp={handleAimPointerUp}
              onPointerCancel={handleAimPointerUp}
              className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-[#FF3B56]/50 bg-[#0a0b10]/80 shadow-[0_0_20px_rgba(255,59,86,0.25)] flex items-center justify-center touch-none cursor-crosshair active:scale-105 transition-transform"
              style={{ touchAction: 'none' }}
            >
              {/* Radar concentric ring */}
              <div className="absolute w-14 h-14 rounded-full border border-[#FF3B56]/30" />
              <div className="absolute top-1/2 left-2 right-2 h-[1px] bg-[#FF3B56]/20 -translate-y-1/2" />
              <div className="absolute left-1/2 top-2 bottom-2 w-[1px] bg-[#FF3B56]/20 -translate-x-1/2" />

              {/* Aim Knob */}
              <div
                className="absolute w-12 h-12 rounded-full bg-[#FF3B56] border border-white shadow-[0_0_15px_rgba(255,59,86,0.8)] transition-transform duration-75 flex items-center justify-center pointer-events-none"
                style={{
                  transform: `translate(${aimStick.x}px, ${aimStick.y}px)`,
                }}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-white" />
              </div>
            </div>
            <span className="text-[10px] font-cyber font-bold tracking-widest text-[#FF3B56]/90 bg-[#0a0b10]/60 px-2 py-0.5 rounded">
              AIM & FIRE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
