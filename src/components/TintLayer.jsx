import React from 'react';
import useAccessibility from '../core/hooks/useAccessibility';

export default function TintLayer() {
  const { isTinted } = useAccessibility();

  if (!isTinted) return null;

  return (
    <div
      aria-hidden
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(255, 140, 0, 0.12)',
        mixBlendMode: 'multiply',
        pointerEvents: 'none',
        zIndex: 1
      }}
    />
  );
}
