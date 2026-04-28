import React, { useEffect, useRef } from 'react';
import { DailyLog } from '../types';
import { ELDCanvasRenderer } from '../services/eldCanvasRenderer';

interface ELDLogSheetProps {
  dailyLog: DailyLog;
}

const ELDLogSheet: React.FC<ELDLogSheetProps> = ({ dailyLog }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const renderer = new ELDCanvasRenderer(canvasRef.current);
      renderer.render(dailyLog);
    }
  }, [dailyLog]);

  const handleDownloadPNG = () => {
    if (canvasRef.current) {
      const renderer = new ELDCanvasRenderer(canvasRef.current);
      const filename = `ELD_Log_${dailyLog.date}_Day${dailyLog.day_number}.png`;
      renderer.downloadPNG(filename);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 min-w-[850px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="bg-[#F97316] text-white px-3 py-1 rounded font-bold">
            Day {dailyLog.day_number}
          </div>
          <span className="text-sm text-gray-600">{dailyLog.date}</span>
        </div>
        <button
          onClick={handleDownloadPNG}
          className="bg-[#1E3A5F] hover:bg-[#152a47] text-white px-4 py-2 rounded text-sm font-semibold"
        >
          Download PNG
        </button>
      </div>
      <canvas ref={canvasRef} className="border border-gray-300 rounded w-full"></canvas>
    </div>
  );
};

export default ELDLogSheet;
