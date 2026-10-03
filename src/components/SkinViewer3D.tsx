import React, { useEffect, useRef } from 'react';
import * as skinview3d from 'skinview3d';

interface SkinViewer3DProps {
  skinUrl?: string;
  capeUrl?: string;
  isSlim?: boolean;
  width?: number;
  height?: number;
  animation?: 'idle' | 'walk' | 'run' | 'wave' | 'none';
  interactive?: boolean;
}

export const SkinViewer3D: React.FC<SkinViewer3DProps> = ({
  skinUrl,
  capeUrl,
  isSlim = false,
  width = 280,
  height = 360,
  animation = 'idle',
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<skinview3d.SkinViewer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    // Default Steve skin fallback
    const defaultSkin = 'https://minotar.net/skin/MHF_Steve';

    const viewer = new skinview3d.SkinViewer({
      canvas: canvas,
      width: width,
      height: height,
      skin: skinUrl || defaultSkin,
      model: isSlim ? 'slim' : 'default',
    });

    if (viewer.renderer) {
      viewer.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }

    viewer.camera.position.z = 60;
    viewer.camera.position.y = 0;

    // Smooth inertia and drag physics
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let velocity = { x: 0, y: 0 };
    let animId: number;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
      velocity = { x: 0, y: 0 };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) {
        // Subtle natural head follow when not dragging
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const mouseNormX = (e.clientX - centerX) / (rect.width / 2);
        const mouseNormY = (e.clientY - centerY) / (rect.height / 2);

        if (viewer.playerObject?.skin?.head) {
          viewer.playerObject.skin.head.rotation.y = Math.max(-0.4, Math.min(0.4, mouseNormX * 0.35));
          viewer.playerObject.skin.head.rotation.x = Math.max(-0.3, Math.min(0.3, mouseNormY * 0.25));
        }
        return;
      }

      const deltaX = e.clientX - prevMouse.x;
      const deltaY = e.clientY - prevMouse.y;
      velocity = { x: deltaX, y: deltaY };

      if (viewer.playerObject) {
        viewer.playerObject.rotation.y += deltaX * 0.015;
        viewer.playerObject.rotation.x = Math.max(
          -0.6,
          Math.min(0.6, viewer.playerObject.rotation.x + deltaY * 0.01)
        );
      }

      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    // Inertia physics loop
    const updateInertia = () => {
      if (!isDragging && (Math.abs(velocity.x) > 0.001 || Math.abs(velocity.y) > 0.001)) {
        if (viewer.playerObject) {
          viewer.playerObject.rotation.y += velocity.x * 0.015;
          viewer.playerObject.rotation.x = Math.max(
            -0.6,
            Math.min(0.6, viewer.playerObject.rotation.x + velocity.y * 0.01)
          );
        }
        velocity.x *= 0.92;
        velocity.y *= 0.92;
      }
      animId = requestAnimationFrame(updateInertia);
    };
    animId = requestAnimationFrame(updateInertia);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      viewer.zoom = Math.max(0.6, Math.min(1.8, viewer.zoom - e.deltaY * 0.001));
    };

    const onDblClick = () => {
      // Double click resets orientation
      if (viewer.playerObject) {
        viewer.playerObject.rotation.y = 0;
        viewer.playerObject.rotation.x = 0;
      }
      viewer.zoom = 1;
    };

    if (interactive) {
      canvas.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      canvas.addEventListener('dblclick', onDblClick);
    }

    // Set animation
    if (animation === 'idle') {
      viewer.animation = new skinview3d.IdleAnimation();
    } else if (animation === 'walk') {
      viewer.animation = new skinview3d.WalkingAnimation();
    } else if (animation === 'run') {
      viewer.animation = new skinview3d.RunningAnimation();
    } else if (animation === 'wave') {
      viewer.animation = new skinview3d.WaveAnimation();
    } else {
      viewer.animation = null;
    }

    if (viewer.animation) {
      viewer.animation.speed = 0.8;
    }

    if (capeUrl) {
      viewer.loadCape(capeUrl);
    }

    viewerRef.current = viewer;

    return () => {
      cancelAnimationFrame(animId);
      if (interactive) {
        canvas.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        canvas.removeEventListener('wheel', onWheel);
        canvas.removeEventListener('dblclick', onDblClick);
      }
      viewer.dispose();
      viewerRef.current = null;
    };
  }, [width, height]);

  // Handle skin changes
  useEffect(() => {
    if (viewerRef.current && skinUrl) {
      viewerRef.current.loadSkin(skinUrl, { model: isSlim ? 'slim' : 'default' });
    }
  }, [skinUrl, isSlim]);

  // Handle cape changes
  useEffect(() => {
    if (viewerRef.current) {
      if (capeUrl) {
        viewerRef.current.loadCape(capeUrl);
      } else {
        viewerRef.current.resetCape();
      }
    }
  }, [capeUrl]);

  // Handle animation changes
  useEffect(() => {
    if (!viewerRef.current) return;
    const viewer = viewerRef.current;

    if (animation === 'idle') {
      viewer.animation = new skinview3d.IdleAnimation();
    } else if (animation === 'walk') {
      viewer.animation = new skinview3d.WalkingAnimation();
    } else if (animation === 'run') {
      viewer.animation = new skinview3d.RunningAnimation();
    } else if (animation === 'wave') {
      viewer.animation = new skinview3d.WaveAnimation();
    } else {
      viewer.animation = null;
    }

    if (viewer.animation) {
      viewer.animation.speed = 0.8;
    }
  }, [animation]);

  return (
    <div className="relative flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none">
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="rounded-2xl"
        style={{
          imageRendering: 'pixelated',
          outline: 'none',
        }}
      />

      {/* Holographic Glowing Pedestal */}
      <div className="absolute -bottom-2 w-44 h-8 rounded-[100%] bg-gradient-to-r from-emerald-500/25 via-teal-400/35 to-cyan-500/25 blur-md pointer-events-none" />
      <div className="absolute -bottom-1 w-36 h-4 rounded-[100%] border border-emerald-400/30 shadow-[0_0_15px_rgba(16,185,129,0.4)] pointer-events-none" />
    </div>
  );
};
