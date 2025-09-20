import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useShowroom } from '../store/useShowroom';

const countryMeta: Record<string, { name: string; year: number; side: 'left' | 'right' }> = {
  Japan: { name: 'Honda Civic Type R', year: 2018, side: 'right' },
  Germany: { name: 'Porsche 911 Carrera GTS', year: 2023, side: 'left' },
  USA: { name: 'Chevrolet Corvette', year: 2024, side: 'right' },
};

const CarOverlay: React.FC = () => {
  const { activeCountry, cameraStage, currentCar } = useShowroom();
  if (!(activeCountry === 'Japan' || activeCountry === 'Germany' || activeCountry === 'USA')) return null;

  const meta = countryMeta[activeCountry];
  const car = currentCar();
  const part = car?.parts?.[0];

  // Decide content by stage
  let title = '';
  let lines: string[] = [];
  if (cameraStage === 3) {
    // Rear view: show name + year
    title = `${meta.name}`;
    lines = [String(meta.year)];
  } else if (cameraStage === 2) {
    // Interior: show HP only
    if (part) title = `${part.data.hp} HP`;
  } else if (cameraStage === 1) {
    // Side view: show price and how many made
    if (part) {
      title = 'Production & Price';
      const price = part.data.price;
      const formatted = price >= 1_000_000 ? `$${(price / 1_000_000).toFixed(1)}M` : `$${price.toLocaleString()}`;
      lines = [
        `Units built: ${part.data.count}`,
        `Price: ${formatted}`,
      ];
    }
  } else {
    // Stage 0 (front) or otherwise: no overlay
    return null;
  }

  const sideClass = meta.side === 'left' ? 'left-8' : 'right-8';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${activeCountry}-${cameraStage}`}
        className={`fixed top-1/3 ${sideClass} z-30 max-w-xs`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div className="glass-strong rounded-2xl p-4 shadow-xl">
          {title && (
            <div className="title-section text-luxury mb-2 whitespace-pre-wrap">{title}</div>
          )}
          {lines.length > 0 && (
            <div className="space-y-1">
              {lines.map((ln) => (
                <div key={ln} className="body-elegant text-secondary-foreground">{ln}</div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CarOverlay;
