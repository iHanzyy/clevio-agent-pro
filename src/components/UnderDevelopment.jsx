'use client';

import { AlertCircle, ArrowLeft, Wrench, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const tasks = [
  { title: 'Bug Fixes', status: 'completed', label: '✓ Done', color: 'text-emerald-400' },
  { title: 'Performance Optimization', status: 'working', label: '● Working', color: 'text-yellow-400' },
  { title: 'UI Improvements', status: 'working', label: '● Working', color: 'text-yellow-400' },
  { title: 'Testing', status: 'pending', label: '○ Pending', color: 'text-gray-500' },
];

export default function UnderDevelopment() {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState([]);
  const [progress, setProgress] = useState(0);

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
    const interval = window.setInterval(
      () =>
        setProgress((prev) => {
          if (prev >= 100) {
            return 0;
          }
          return prev + 1;
        }),
      100,
    );
    return () => window.clearInterval(interval);
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
          'absolute -top-28 -left-16 h-[26rem] w-[26rem] rounded-full bg-gradient-to-br from-yellow-500/30 via-amber-500/20 to-transparent blur-3xl opacity-20',
        intensity: 20,
      },
      {
        className:
          'absolute -bottom-24 -right-12 h-[24rem] w-[24rem] rounded-full bg-gradient-to-br from-orange-500/30 via-amber-500/20 to-transparent blur-3xl opacity-20',
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
            className="particle absolute rounded-full bg-yellow-400/10"
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

        <div className="absolute left-8 top-8 h-24 w-24 rounded-tr-3xl border-2 border-yellow-400/30 border-l-transparent border-b-transparent" />
        <div className="absolute bottom-8 right-8 h-24 w-24 rounded-bl-3xl border-2 border-orange-400/30 border-r-transparent border-t-transparent" />
      </div>

      <div className="relative z-10 flex max-w-5xl flex-col items-center gap-10 text-center">
        <div className="relative">
          <div className="absolute inset-0 -z-10 h-32 w-32 rounded-full bg-yellow-400/20 blur-3xl" />
          <Wrench
            className="mx-auto h-20 w-20 text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.7)] animate-spin"
            style={{ animationDuration: '3s' }}
          />
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-transparent md:text-7xl bg-gradient-to-r from-yellow-400 via-orange-400 to-amber-400 bg-clip-text drop-shadow-[0_0_25px_rgba(250,204,21,0.6)]">
            Under Development
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-400 md:text-xl">
            This feature is currently being improved and optimized. We&apos;re making it better for you!
          </p>
        </div>

        <div className="w-full space-y-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6 text-left backdrop-blur">
          <div className="flex items-start gap-4">
            <AlertCircle className="mt-1 h-8 w-8 text-yellow-400" />
            <div>
              <p className="text-lg font-semibold text-yellow-400">Temporary Maintenance</p>
              <p className="text-gray-300">
                We&apos;re working on improvements and bug fixes. This feature will be back online shortly.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-gray-700 bg-gray-800/50 p-6 text-left backdrop-blur">
          <div className="mb-4 flex items-center gap-2 text-sm uppercase tracking-[0.3em] text-gray-400">
            <Zap className="h-4 w-4 text-yellow-400" />
            Development Tasks
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {tasks.map((task) => (
              <div
                key={task.title}
                className="flex items-center justify-between rounded-xl border border-gray-700/60 bg-gray-900/40 px-4 py-3"
              >
                <span className="font-semibold text-white">{task.title}</span>
                <span className={`text-xs font-semibold uppercase ${task.color}`}>{task.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-3xl space-y-2 text-left">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Overall Progress</span>
            <span className="text-white">{progress}%</span>
          </div>
          <div className="h-[2px] w-full rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-500 via-orange-500 to-amber-500 transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoBack}
          className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-6 py-3 font-semibold text-black transition duration-300 hover:scale-105 hover:shadow-[0_12px_45px_rgba(234,179,8,0.4)]"
        >
          <ArrowLeft className="h-5 w-5 transition duration-300 group-hover:-translate-x-0.5" />
          <span className="relative z-10">Go Back</span>
          <span className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-0 transition duration-300 group-hover:opacity-100 bg-gradient-to-r from-yellow-500 via-orange-500 to-amber-500" />
        </button>

        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-yellow-500 shadow-[0_0_15px_rgba(250,204,21,0.7)]" />
          Maintenance in progress
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
