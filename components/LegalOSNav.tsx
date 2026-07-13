'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Nav global Legal OS con logo brillante.
 * Aparece en TODAS las páginas via layout.tsx.
 */
export default function LegalOSNav() {
  const pathname = usePathname();
  void pathname;

  return (
    <nav className="border-b border-[#60a5fa]/15 relative z-10">
      <style dangerouslySetInnerHTML={{ __html: `
        .nav-glow-logo { filter: drop-shadow(0 0 14px rgba(0,212,255,0.8)) drop-shadow(0 0 35px rgba(0,212,255,0.4)); }
        .nav-glow-title { text-shadow: 0 0 20px rgba(255,255,255,0.5); }
        .nav-glow-cyan { text-shadow: 0 0 28px rgba(0,212,255,0.65), 0 0 60px rgba(0,212,255,0.25); color: #00d4ff; }
      `}} />
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <svg className="nav-glow-logo" width="30" height="34" viewBox="0 0 38 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="lgNav" x1="0" y1="0" x2="38" y2="44" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#00d4ff" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
            </defs>
            <path d="M2 2 L13 2 L13 26 L36 26 L36 34 Q19 44 2 36 Z" fill="url(#lgNav)" />
            <rect x="14" y="2" width="5" height="24" fill="#05070f" rx="0.5" />
            <rect x="27" y="2" width="5" height="24" fill="#05070f" rx="0.5" />
            <rect x="14" y="11" width="18" height="5" fill="#05070f" rx="0.5" />
          </svg>
          <div className="flex items-baseline tracking-tight font-bold text-xl nav-glow-title">
            <span className="text-white">LEGAL</span>
            <span className="nav-glow-cyan">HELP</span>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xs font-mono uppercase tracking-widest transition text-[#00d4ff]"
          >
            Documentos
          </Link>
          <div className="w-px h-4 bg-[#60a5fa]/20" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#00d4ff] hidden sm:inline">CHILE</span>
        </div>
      </div>
    </nav>
  );
}
