"use client";

import dynamic from "next/dynamic";

const StagewiseToolbar = dynamic(
  () => import("./StagewiseToolbar"),
  { ssr: false }
);

export default function ClientStagewiseToolbar() {
  // Only show stagewise toolbar in development mode
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
  return <StagewiseToolbar />;
} 