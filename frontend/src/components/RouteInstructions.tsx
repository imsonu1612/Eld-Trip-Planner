import React from 'react';

interface RouteInstructionsProps {
  instructions: string[];
}

const RouteInstructions: React.FC<RouteInstructionsProps> = ({ instructions }) => {
  const normalized = instructions.filter((item) => item && item.trim().length > 0);
  let stepNumber = 0;

  if (normalized.length === 0) {
    return null;
  }

  return (
    <div className="premium-card interactive-lift animate-rise animate-delay-3 p-6">
      <p className="section-kicker">Navigation</p>
      <h3 className="section-title mb-4">Route Instructions</h3>
      <ol className="ml-1 max-h-72 space-y-2 overflow-y-auto pr-2 text-sm text-gray-700">
        {normalized.map((instruction, index) => (
          instruction.endsWith(':') ? (
            <li key={`${index}-${instruction.slice(0, 30)}`} className="animate-fade pt-2 text-xs font-bold uppercase tracking-wide text-[#1d8a8a]" style={{ animationDelay: `${index * 35}ms` }}>
              {instruction}
            </li>
          ) : (
            (() => {
              stepNumber += 1;
              return (
            <li key={`${index}-${instruction.slice(0, 30)}`} className="animate-fade flex gap-2 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 leading-5" style={{ animationDelay: `${index * 35}ms` }}>
              <span className="mt-0.5 text-xs font-bold text-[#ea580c]">{stepNumber}.</span>
              <span>{instruction}</span>
            </li>
              );
            })()
          )
        ))}
      </ol>
    </div>
  );
};

export default RouteInstructions;
