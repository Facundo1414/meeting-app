// Server Component - no 'use client'
// Fondos decorativos livianos sin blur pesado en mobile

export function DecorativeBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Versión simplificada para mejor performance - sin blur en mobile */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200/50 rounded-full sm:mix-blend-multiply sm:blur-xl opacity-70" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200/50 rounded-full sm:mix-blend-multiply sm:blur-xl opacity-70" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-200/50 rounded-full sm:mix-blend-multiply sm:blur-xl opacity-70" />
    </div>
  );
}
