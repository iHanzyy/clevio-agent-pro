'use client';

import { ArrowLeft, Clock, Rocket } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export default function ComingSoon() {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 50 }, (_, id) => ({
        id,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 2 + 1,
        duration: Math.random() * 5 + 3,
        delay: Math.random() * 3,
      })),
    );
  }, []);

  useEffect(() => {
    let rafId;
    const handlePointerMove = (event) => {
      const { innerWidth, innerHeight } = window;
      const relativeX = ((event.clientX ?? innerWidth / 2) / innerWidth - 0.5) * 2;
      const relativeY = ((event.clientY ?? innerHeight / 2) / innerHeight - 0.5) * 2;

      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() =>
        setPointer({
          x: relativeX,
          y: relativeY,
        }),
      );
    };

    window.addEventListener('mousemove', handlePointerMove);
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const orbStyles = useMemo(
    () => [
      {
        className:
          'absolute -top-32 -left-10 h-[26rem] w-[26rem] rounded-full bg-gradient-to-br from-green-500/30 via-emerald-500/20 to-transparent blur-3xl opacity-20',
        intensity: 20,
      },
      {
        className:
          'absolute -bottom-28 -right-16 h-[22rem] w-[22rem] rounded-full bg-gradient-to-br from-emerald-500/30 via-teal-500/20 to-transparent blur-3xl opacity-20',
        intensity: 20,
      },
    ],
    [],
  );

  const handleGoBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-gray-900 via-black to-gray-900 px-6 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {orbStyles.map((orb, index) => (
          <div
            key={index}
            className={orb.className}
            style={{
              transform: `translate3d(${pointer.x * orb.intensity}px, ${pointer.y * orb.intensity}px, 0)`,
              transition: 'transform 0.7s ease-out',
            }}
          />
        ))}

        {particles.map((particle) => (
          <span
            key={particle.id}
            className="particle absolute rounded-full bg-green-400/10"
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

        <div className="absolute left-8 top-8 h-24 w-24 rounded-tr-3xl border-2 border-emerald-400/30 border-l-transparent border-b-transparent" />
        <div className="absolute bottom-8 right-8 h-24 w-24 rounded-bl-3xl border-2 border-green-400/30 border-r-transparent border-t-transparent" />
      </div>

      <div className="relative z-10 flex max-w-5xl flex-col items-center gap-10 text-center">
        <div className="relative">
          <div className="absolute inset-0 -z-10 h-32 w-32 rounded-full bg-green-500/20 blur-3xl" />
          <Rocket className="mx-auto h-20 w-20 text-green-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.8)] animate-bounce" />
        </div>

        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-transparent md:text-8xl bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text drop-shadow-[0_0_25px_rgba(34,197,94,0.6)]">
            Coming Soon
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-400 md:text-xl">
            We&apos;re working hard to bring you something amazing! This feature is currently under development and will
            be available soon.
          </p>
        </div>

        <div className="w-full max-w-3xl space-y-2 text-left">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Progress</span>
            <span className="text-white">75%</span>
          </div>
          <div className="h-[2px] w-full rounded-full bg-gray-800">
            <div className="h-full w-[75%] rounded-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 animate-pulse" />
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoBack}
          className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-6 py-3 font-semibold text-black transition duration-300 hover:scale-105 hover:shadow-[0_12px_45px_rgba(16,185,129,0.4)]"
        >
          <ArrowLeft className="h-5 w-5 transition duration-300 group-hover:-translate-x-0.5" />
          <span className="relative z-10">Go Back</span>
          <span className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-0 transition duration-300 group-hover:opacity-100 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />
        </button>

        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Clock className="h-4 w-4 animate-pulse text-emerald-400" />
          Feature in development queue
        </div>
      </div>

      <style jsx>{`
        .particle {
          animation-name: particlePulse;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
        }

        @keyframes particlePulse {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.2;
          }
          50% {
            transform: translateY(-6px) scale(1.6);
            opacity: 0.6;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 0.2;
          }
        }
      `}</style>
    </section>
  );
}
