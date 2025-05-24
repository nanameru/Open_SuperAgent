'use client';

import dynamic from "next/dynamic";

// Stagewise toolbar component for development mode only
const StagewiseDevToolbar = dynamic(
  () => {
    if (process.env.NODE_ENV !== 'development') {
      return Promise.resolve(() => null);
    }

    return import('@stagewise/toolbar-next').then((mod) => {
      const stagewiseConfig = {
        plugins: []
      };

      return function StagewiseComponent() {
        return <mod.StagewiseToolbar config={stagewiseConfig} />;
      };
    });
  },
  {
    ssr: false, // Client-side only
    loading: () => null
  }
);

export default StagewiseDevToolbar; 