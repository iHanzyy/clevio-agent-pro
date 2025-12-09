"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Compass, Home } from "lucide-react";

export default function NotFoundPage() {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    let rafId;
    const handlePointerMove = (event) => {
      const { innerWidth, innerHeight } = window;
      const x = ((event.clientX ?? innerWidth / 2) / innerWidth - 0.5) * 2;
      const y = ((event.clientY ?? innerHeight / 2) / innerHeight - 0.5) * 2;

      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => setPointer({ x, y }));
    };

    window.addEventListener("mousemove", handlePointerMove);
    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    setParticles(
      Array.from({ length: 50 }, (_, index) => ({
        id: index,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 2 + 1,
        duration: Math.random() * 6 + 3,
        delay: Math.random() * 3,
      }))
    );
  }, []);

  const orbStyles = useMemo(
    () => [
      {
        className:
          "absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-sky-500/60 via-blue-500/40 to-transparent blur-[140px] opacity-70",
        intensity: 40,
      },
      {
        className:
          "absolute -bottom-24 -left-16 h-[24rem] w-[24rem] rounded-full bg-gradient-to-br from-purple-600/60 via-fuchsia-500/40 to-transparent blur-[120px] opacity-80",
        intensity: 25,
      },
    ],
    []
  );

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-gray-950 via-gray-900 to-black px-6 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {orbStyles.map((orb, index) => (
          <div
            key={index}
            className={orb.className}
            style={{
              transform: `translate3d(${pointer.x * orb.intensity}px, ${
                pointer.y * orb.intensity
              }px, 0)`,
              transition: "transform 0.8s ease-out",
            }}
          />
        ))}

        {particles.map((particle) => (
          <span
            key={particle.id}
            className="particle absolute rounded-full bg-cyan-200/60"
            style={{
              top: `${particle.top}%`,
              left: `${particle.left}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}

        <div className="absolute left-8 top-8 h-24 w-24 rounded-tr-3xl border border-cyan-500/40 border-l-transparent border-b-transparent" />
        <div className="absolute bottom-8 right-8 h-24 w-24 rounded-bl-3xl border border-fuchsia-500/40 border-r-transparent border-t-transparent" />
      </div>

      <div className="relative z-10 flex max-w-3xl flex-col items-center gap-8 text-center">
        <div className="space-y-6">
          <p className="flex items-center justify-center gap-2 text-sm font-medium uppercase tracking-[0.3em] text-sky-200/80">
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
            All systems operational
          </p>

          <div className="glitch-wrapper">
            <span className="glitch-text">404</span>
          </div>

          <p className="text-lg text-slate-200 md:text-xl">
            The page you're looking for might have been moved or doesn't exist.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/"
            className="group inline-flex items-center justify-center gap-3 rounded-xl border border-white/80 bg-white px-7 py-3 text-base font-medium text-slate-900 shadow-[0_14px_34px_rgba(59,130,246,0.22)] transition duration-200 hover:scale-105 hover:bg-gradient-to-r hover:from-sky-500 hover:to-fuchsia-500 hover:text-white hover:shadow-[0_18px_38px_rgba(99,102,241,0.45)]"
          >
            <Home className="h-5 w-5 transition-colors duration-200 group-hover:text-white" />
            <span>Go Home</span>
          </Link>
          <Link
            href="/dashboard"
            className="group inline-flex items-center justify-center gap-3 rounded-xl border border-slate-500/60 bg-white/5 px-7 py-3 text-base font-medium text-slate-200 backdrop-blur transition duration-200 hover:scale-105 hover:border-sky-400/80 hover:bg-sky-500/10 hover:text-white hover:shadow-[0_14px_34px_rgba(56,189,248,0.28)]"
          >
            <Compass className="h-5 w-5 transition-transform duration-500 group-hover:-rotate-90" />
            <span>Explore</span>
          </Link>
        </div>
      </div>

      <style jsx>{`
        .glitch-wrapper {
          position: relative;
          display: inline-flex;
          font-size: clamp(120px, 32vw, 200px);
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .glitch-text {
          position: relative;
          display: inline-block;
          color: transparent;
          background-image: linear-gradient(120deg, #38bdf8, #a855f7, #ec4899);
          background-clip: text;
          -webkit-background-clip: text;
          filter: drop-shadow(0 0 16px rgba(79, 70, 229, 0.75));
          animation: pulse 2.5s ease-in-out infinite;
        }

        .glitch-text::before,
        .glitch-text::after {
          content: "404";
          position: absolute;
          inset: 0;
          background-image: inherit;
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          opacity: 0.7;
          animation: glitch 2s infinite;
        }

        .glitch-text::before {
          transform: translate3d(-3px, -3px, 0);
          mix-blend-mode: screen;
        }

        .glitch-text::after {
          transform: translate3d(3px, 3px, 0);
          mix-blend-mode: lighten;
        }

        .particle {
          animation-name: particlePulse;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          opacity: 0.7;
        }

        @keyframes particlePulse {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-6px) scale(1.6);
            opacity: 0.9;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 0.3;
          }
        }

        @keyframes glitch {
          0% {
            clip-path: inset(80% 0 0 0);
          }
          10% {
            clip-path: inset(10% 0 85% 0);
          }
          20% {
            clip-path: inset(50% 0 30% 0);
          }
          30% {
            clip-path: inset(10% 0 85% 0);
          }
          40% {
            clip-path: inset(40% 0 43% 0);
          }
          50% {
            clip-path: inset(80% 0 10% 0);
          }
          60% {
            clip-path: inset(10% 0 85% 0);
          }
          70% {
            clip-path: inset(50% 0 30% 0);
          }
          80% {
            clip-path: inset(80% 0 10% 0);
          }
          90% {
            clip-path: inset(10% 0 85% 0);
          }
          100% {
            clip-path: inset(50% 0 30% 0);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
          }
          50% {
            text-shadow: 0 0 45px rgba(255, 255, 255, 0.9);
          }
        }
      `}</style>
    </main>
  );
}
