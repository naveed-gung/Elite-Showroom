import React from 'react';
import { motion } from 'framer-motion';
import { Slider } from './ui/slider';
import { useShowroom } from '../store/useShowroom';
import { Sun } from 'lucide-react';

const BrightnessControl: React.FC = () => {
  const { brightness, setBrightness } = useShowroom();

  const onChange = (val: number[]) => {
    const v = Array.isArray(val) ? val[0] : (val as unknown as number);
    setBrightness(Math.max(0, Math.min(1, v)));
  };

  return (
    <>
      {/* Desktop: vertical control center-right */}
      <div className="hidden md:flex pointer-events-auto fixed right-4 top-1/2 -translate-y-1/2 z-40">
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="
            flex flex-col items-center gap-3 p-3 rounded-2xl
            backdrop-blur-2xl border bg-white/6 border-white/15
            shadow-[0_20px_60px_rgba(0,0,0,0.5)]
          "
        >
          <Sun size={18} className="text-white/85" />
          <div className="h-48 flex items-center">
            <Slider
              orientation="vertical"
              min={0}
              max={1}
              step={0.01}
              value={[brightness]}
              onValueChange={onChange}
              className="h-full w-8"
                thumbClassName="translate-x-[6px] bg-black border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.45)]"
            />
          </div>
        </motion.div>
      </div>

      {/* Mobile: compact bottom-right */}
      <div className="md:hidden pointer-events-auto fixed right-4 bottom-24 z-40">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="
            flex items-center gap-2 px-3 py-2 rounded-xl
            backdrop-blur-2xl border bg-white/6 border-white/15
            shadow-[0_12px_40px_rgba(0,0,0,0.5)]
          "
        >
          <Sun size={16} className="text-white/85" />
          <div className="w-28">
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[brightness]}
              onValueChange={onChange}
                thumbClassName="translate-x-[2px] bg-black border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.45)]"
            />
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default BrightnessControl;
