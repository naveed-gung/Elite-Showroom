import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShowroom } from '../store/useShowroom';

const CarDataHUD: React.FC = () => {
  const { currentPart, activeCountry } = useShowroom();
  const part = currentPart();

  // Don't show HUD when a country is selected (as requested)
  if (!part || activeCountry) return null;

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    }
    return `$${price.toLocaleString()}`;
  };

  const dataItems = [
    { label: 'Power', value: `${part.data.hp} HP`, icon: '⚡' },
    { label: 'Year', value: part.data.year.toString(), icon: '📅' },
    { label: 'Units', value: part.data.count.toString(), icon: '🏭' },
    { label: 'Price', value: formatPrice(part.data.price), icon: '💎' },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={part.name}
        className="fixed top-32 right-6 space-y-3 z-30"
        initial={{ opacity: 0, x: 20, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: 20, y: -10 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Part Name Header */}
        <motion.div
          className="glass-strong rounded-2xl p-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <h3 className="title-section text-luxury text-center">
            {part.name}
          </h3>
        </motion.div>

        {/* Data Cards */}
        <div className="space-y-2">
          {dataItems.map((item, index) => (
            <motion.div
              key={item.label}
              className="glass rounded-xl p-3 hover-lift hover-glow"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                duration: 0.3, 
                delay: 0.2 + index * 0.05,
                ease: 'easeOut' 
              }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{item.icon}</span>
                  <span className="body-elegant text-secondary-foreground">
                    {item.label}
                  </span>
                </div>
                <span className="font-medium text-foreground">
                  {item.value}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Scroll Hint */}
        <motion.div
          className="glass rounded-xl p-3 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          <p className="body-elegant text-muted-foreground text-xs">
            Scroll to explore parts
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CarDataHUD;