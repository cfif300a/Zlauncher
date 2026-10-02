import React, { useEffect, useRef } from 'react';

interface ParticleCanvasProps {
  theme: 'cyber' | 'nether' | 'end' | 'lush' | 'overworld';
  enabled: boolean;
}

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  maxOpacity: number;
  pulseSpeed: number;
  color: string;
  twinkle: number;
  twinkleSpeed: number;
  layer: number; // 1 (far, slow) to 3 (near, fast)
}

export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ theme, enabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Color palettes by theme with rich AAA shades
    const themePalettes: Record<string, string[]> = {
      cyber: ['#10b981', '#06b6d4', '#3b82f6', '#14b8a6', '#6ee7b7', '#0284c7'],
      nether: ['#ef4444', '#f97316', '#dc2626', '#b91c1c', '#fbbf24', '#7f1d1d'],
      end: ['#a855f7', '#8b5cf6', '#d946ef', '#c084fc', '#e879f9', '#4c1d95'],
      lush: ['#22c55e', '#84cc16', '#10b981', '#eab308', '#a3e635', '#15803d'],
      overworld: ['#38bdf8', '#fbbf24', '#60a5fa', '#f59e0b', '#bae6fd', '#fef08a'],
    };

    const colors = themePalettes[theme] || themePalettes.cyber;
    const particleCount = 65;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const layer = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
      const maxOpacity = (0.25 + Math.random() * 0.55) * (layer / 3);

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        baseX: 0,
        baseY: 0,
        size: (1.2 + Math.random() * 3.5) * (layer / 2),
        speedX: (Math.random() - 0.5) * 0.4 * layer,
        speedY:
          theme === 'nether'
            ? -(0.6 + Math.random() * 1.4) * (layer / 2) // Nether embers rise fast
            : (Math.random() - 0.5) * 0.35 * layer,
        opacity: Math.random() * maxOpacity,
        maxOpacity,
        pulseSpeed: 0.006 + Math.random() * 0.015,
        color: colors[Math.floor(Math.random() * colors.length)],
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.02 + Math.random() * 0.04,
        layer,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // Subtle ambient top light aura
      const gradient = ctx.createRadialGradient(
        width / 2,
        -100,
        50,
        width / 2,
        0,
        width * 0.7
      );
      if (theme === 'nether') {
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.08)');
        gradient.addColorStop(1, 'transparent');
      } else if (theme === 'end') {
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.08)');
        gradient.addColorStop(1, 'transparent');
      } else if (theme === 'lush') {
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.08)');
        gradient.addColorStop(1, 'transparent');
      } else {
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.08)');
        gradient.addColorStop(1, 'transparent');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Render interactive particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Base motion + gentle sine wobble
        p.x += p.speedX + Math.sin(time + p.twinkle) * 0.15;
        p.y += p.speedY;

        // Interactive mouse avoidance
        if (mouseRef.current.active) {
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 120;

          if (dist < maxDist && dist > 0) {
            const force = (maxDist - dist) / maxDist;
            p.x += (dx / dist) * force * 3;
            p.y += (dy / dist) * force * 3;
          }
        }

        // Opacity pulsing
        p.twinkle += p.twinkleSpeed;
        const currentOpacity =
          p.opacity * (0.6 + Math.sin(p.twinkle) * 0.4);

        // Screen boundaries
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, currentOpacity));
        ctx.shadowBlur = 10 * p.layer;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-90 transition-opacity duration-700"
    />
  );
};
