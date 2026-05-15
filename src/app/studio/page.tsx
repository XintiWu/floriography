"use client";

import dynamic from 'next/dynamic';
import '../../studio.css';

// Dynamically import the Studio App with no SSR as it relies on browser APIs (window, moveable, etc.)
const StudioApp = dynamic(() => import('../../App'), { ssr: false });

export default function StudioPage() {
  return (
    <main className="studio-root">
      <StudioApp />
    </main>
  );
}
