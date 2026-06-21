'use client';

import { useEffect, useRef } from 'react';

/**
 * Fondo decorativo "Legal OS": lluvia de datos/códigos muy sutil (estilo HUD).
 * Usa glifos legales + alfanuméricos en cian tenue. Fijo, detrás del contenido.
 * Respeta prefers-reduced-motion y limpia el rAF al desmontar.
 */
export default function LegalOSBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const cv: HTMLCanvasElement = canvas;
    const ctx: CanvasRenderingContext2D = context;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVXYZ0123456789§¶©®°ΩΣ∆◊⌁⌐¬±×÷ʃ'.split('');
    let columns = 0;
    let drops: number[] = [];
    const fontSize = 16;

    function resize() {
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
      columns = Math.floor(cv.width / fontSize);
      drops = Array.from({ length: columns }, () => Math.random() * -cv.height / fontSize);
    }
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let last = 0;

    function draw(now: number) {
      // ~14 fps: lento y sutil
      if (now - last > 70) {
        last = now;
        ctx.fillStyle = 'rgba(5, 7, 15, 0.28)';
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.font = `${fontSize}px var(--font-geist-mono), monospace`;
        for (let i = 0; i < drops.length; i++) {
          const char = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          const x = i * fontSize;
          const y = drops[i] * fontSize;
          // cabeza un poco más brillante, cola tenue
          ctx.fillStyle = Math.random() > 0.975 ? 'rgba(0, 212, 255, 0.35)' : 'rgba(96, 165, 250, 0.10)';
          ctx.fillText(char, x, y);
          if (y > cv.height && Math.random() > 0.975) drops[i] = 0;
          drops[i]++;
        }
      }
      raf = requestAnimationFrame(draw);
    }

    if (!reduce) raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        opacity: 0.5,
        pointerEvents: 'none',
      }}
    />
  );
}
