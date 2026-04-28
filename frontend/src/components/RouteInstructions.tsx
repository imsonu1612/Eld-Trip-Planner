import React from 'react';

interface RouteInstructionsProps {
  instructions: string[];
}

const RouteInstructions: React.FC<RouteInstructionsProps> = ({ instructions }) => {
  const normalized = instructions.filter((item) => item && item.trim().length > 0);

  if (normalized.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-6">
      <h3 className="text-lg font-bold text-[#1E3A5F] mb-4">Route Instructions</h3>
      <ol className="list-decimal ml-5 space-y-2 text-sm text-gray-700 max-h-72 overflow-y-auto pr-2">
        {normalized.map((instruction, index) => (
          <li key={`${index}-${instruction.slice(0, 30)}`} className="leading-5">
            {instruction}
          </li>
        ))}
      </ol>
    </div>
  );
};

export default RouteInstructions;
