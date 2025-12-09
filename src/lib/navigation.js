'use client';

/**
 * Navigation helpers for feature status pages.
 */
export const navigateTo = {
  /**
   * Redirect to the Coming Soon page via window navigation.
   */
  comingSoon: () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/coming-soon';
    }
  },

  /**
   * Redirect to the Under Development page via window navigation.
   */
  underDevelopment: () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/under-development';
    }
  },

  /**
   * Redirect to Coming Soon using a Next.js router instance.
   * @param {import('next/navigation').AppRouterInstance} router
   */
  comingSoonWithRouter: (router) => {
    if (router?.push) {
      router.push('/coming-soon');
    } else {
      navigateTo.comingSoon();
    }
  },

  /**
   * Redirect to Under Development using a Next.js router instance.
   * @param {import('next/navigation').AppRouterInstance} router
   */
  underDevelopmentWithRouter: (router) => {
    if (router?.push) {
      router.push('/under-development');
    } else {
      navigateTo.underDevelopment();
    }
  },
};

// Basic usage:
// import { navigateTo } from '@/lib/navigation';
// onClick={navigateTo.comingSoon}
//
// With Next.js Router:
// import { useRouter } from 'next/navigation';
// const router = useRouter();
// onClick={() => navigateTo.comingSoonWithRouter(router)};
