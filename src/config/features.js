export const FEATURES = {
  DASHBOARD: {
    status: 'active',
    path: '/dashboard',
    name: 'Dashboard',
    description: 'Centralized overview of your assistants.',
  },
  AGENTS: {
    status: 'active',
    path: '/dashboard/agents',
    name: 'Agents',
    description: 'Manage your AI agents.',
  },
  AI_CHAT: {
    status: 'coming-soon',
    name: 'AI Assistant',
    description: 'Conversational AI workspace.',
  },
  ANALYTICS: {
    status: 'under-development',
    name: 'Analytics',
    description: 'Deep performance insights.',
  },
  REPORTS: {
    status: 'coming-soon',
    name: 'Reports',
    description: 'Automated summaries and exports.',
  },
  SETTINGS: {
    status: 'active',
    path: '/dashboard/settings',
    name: 'Settings',
    description: 'Account and workspace controls.',
  },
  NOTIFICATIONS: {
    status: 'active',
    path: '/notifications',
    name: 'Notifications',
    description: 'Real-time alerts and updates.',
  },
  TEAM_MANAGEMENT: {
    status: 'under-development',
    name: 'Team Management',
    description: 'Assign roles and collaborate with teammates.',
  },
  API_INTEGRATION: {
    status: 'under-development',
    name: 'API Integration',
    description: 'Connect to external services seamlessly.',
  },
  EXPORT_DATA: {
    status: 'coming-soon',
    name: 'Export Data',
    description: 'Bulk export of agent chats and stats.',
  },
};

/**
 * Retrieve the configuration of a feature by key.
 * @param {keyof typeof FEATURES} featureKey
 * @returns {object|null}
 */
export const getFeatureStatus = (featureKey) => FEATURES[featureKey] ?? null;

/**
 * Determine if a feature is active.
 * @param {keyof typeof FEATURES} featureKey
 * @returns {boolean}
 */
export const isFeatureActive = (featureKey) => getFeatureStatus(featureKey)?.status === 'active';

/**
 * List active features with metadata.
 * @returns {Array<{key: string} & typeof FEATURES[string]>}
 */
export const getActiveFeatures = () =>
  Object.entries(FEATURES)
    .filter(([, feature]) => feature.status === 'active')
    .map(([key, feature]) => ({ key, ...feature }));

/**
 * List coming soon features with metadata.
 * @returns {Array<{key: string} & typeof FEATURES[string]>}
 */
export const getComingSoonFeatures = () =>
  Object.entries(FEATURES)
    .filter(([, feature]) => feature.status === 'coming-soon')
    .map(([key, feature]) => ({ key, ...feature }));

// Usage:
// import { FEATURES, isFeatureActive, getComingSoonFeatures } from '@/config/features';
// const aiStatus = getFeatureStatus('AI_CHAT');
// if (!isFeatureActive('AI_CHAT')) navigateTo.comingSoon();
// const comingSoonList = getComingSoonFeatures();
// const activeFeatures = getActiveFeatures();
