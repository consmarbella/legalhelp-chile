'use client';

import { useEffect, useRef } from 'react';

/**
 * Fondo decorativo "Legal OS": lluvia de datos/códigos brillante (estilo HUD).
 * Canvas con z-index:-1 (detrás del contenido), SIN opacity.
 * El trail usa globalCompositeOperation para no pintar color sólido
 * que pueda tapar el contenido (el canvas es transparente excepto las letras).
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
      if (now - last > 70) {
        last = now;
        // Trail: fade out las letras anteriores sin pintar fondo sólido
        ctx.globalCompositeOperation = 'destination-in';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.globalCompositeOperation = 'source-over';

        ctx.font = `${fontSize}px monospace`;
        for (let i = 0; i < drops.length; i++) {
          const char = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          const x = i * fontSize;
          const y = drops[i] * fontSize;
          ctx.fillStyle = Math.random() > 0.92 ? 'rgba(0, 212, 255, 0.95)' : 'rgba(96, 165, 250, 0.4)';
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
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
}
