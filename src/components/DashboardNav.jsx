'use client';

import { FEATURES } from '@/config/features';
import { navigateTo } from '@/lib/navigation';
import { Check, Rocket, Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';

const FEATURE_ORDER = [
  { key: 'DASHBOARD', label: 'Dashboard' },
  { key: 'ANALYTICS', label: 'Analytics' },
  { key: 'AI_CHAT', label: 'AI Assistant' },
  { key: 'REPORTS', label: 'Reports' },
  { key: 'SETTINGS', label: 'Settings' },
  { key: 'API_INTEGRATION', label: 'API Integration' },
  { key: 'EXPORT_DATA', label: 'Export Data' },
  { key: 'TEAM_MANAGEMENT', label: 'Team Management' },
];

const STATUS_META = {
  active: {
    label: 'Live',
    textClass: 'text-white',
    borderClass: 'border-emerald-500/50',
    hoverShadowClass: 'hover:shadow-[0_10px_35px_rgba(16,185,129,0.35)]',
    Icon: Check,
  },
  'coming-soon': {
    label: 'Coming Soon',
    textClass: 'text-green-400',
    borderClass: 'border-green-400/40',
    hoverShadowClass: 'hover:shadow-[0_10px_35px_rgba(34,197,94,0.3)]',
    Icon: Rocket,
  },
  'under-development': {
    label: 'Under Development',
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-400/40',
    hoverShadowClass: 'hover:shadow-[0_10px_35px_rgba(250,204,21,0.25)]',
    Icon: Wrench,
  },
};

export default function DashboardNav() {
  const router = useRouter();

  const handleFeatureClick = (featureKey) => {
    const feature = FEATURES[featureKey];
    if (!feature) {
      return;
    }

    switch (feature.status) {
      case 'active': {
        if (feature.path) {
          router.push(feature.path);
        }
        break;
      }
      case 'coming-soon': {
        navigateTo.comingSoon();
        break;
      }
      case 'under-development': {
        navigateTo.underDevelopment();
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {FEATURE_ORDER.map(({ key, label }) => {
        const feature = FEATURES[key] ?? { status: 'coming-soon' };
        const meta = STATUS_META[feature.status] ?? STATUS_META['coming-soon'];
        const Icon = meta.Icon;

        return (
          <button
            key={key}
            type="button"
            onClick={() => handleFeatureClick(key)}
            className={`group flex flex-col rounded-lg border bg-gray-800/50 p-4 text-left transition duration-300 hover:scale-105 hover:bg-gray-800 ${meta.hoverShadowClass}`}
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-full border ${meta.borderClass}`}>
              <Icon className={`h-5 w-5 ${meta.textClass}`} />
            </div>
            <div className="mt-4 space-y-1">
              <p className={`text-lg font-semibold ${meta.textClass}`}>
                {label}
              </p>
              <p className="text-sm text-gray-400">{meta.label}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
