import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';

function VersionDisplay() {
  const { isDarkMode } = useDarkMode();

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <div className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
        isDarkMode 
          ? 'bg-gray-800 text-gray-400 border border-gray-700' 
          : 'bg-gray-100 text-gray-600 border border-gray-200'
      }`}>
        v1.0.2
      </div>
    </div>
  );
}

export default VersionDisplay; 