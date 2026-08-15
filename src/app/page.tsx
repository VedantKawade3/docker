"use client";

import dynamic from 'next/dynamic';

// Dynamically import components that rely on browser globals or state that shouldn't be SSR'd
const DashboardLayout = dynamic(() => import('@/components/layout/DashboardLayout'), { ssr: false });
const MockEditor = dynamic(() => import('@/components/editor/MockEditor'), { ssr: false });
const TerminalEmulator = dynamic(() => import('@/components/terminal/TerminalEmulator'), { ssr: false });
const DockerVisualizer = dynamic(() => import('@/components/visualizer/DockerVisualizer'), { ssr: false });

export default function Home() {
  return (
    <DashboardLayout
      editor={<MockEditor />}
      visualizer={<DockerVisualizer />}
      terminal={<TerminalEmulator />}
    />
  );
}
