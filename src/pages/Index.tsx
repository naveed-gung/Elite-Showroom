import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import GlassSidebar from '../components/GlassSidebar';
import ShowroomCanvas from '../components/ShowroomCanvas';
import CarDataHUD from '../components/CarDataHUD';

import { useShowroom } from '../store/useShowroom';

const Index = () => {
  const { setCurrentShotIndex, currentPart, brightness } = useShowroom();
  const [isWarming, setIsWarming] = useState(true);

  // Countries available in the showroom
  const countries = ['Germany', 'USA', 'Japan'];

  // Handle scroll for part navigation
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      
      const { activeCountry, setActiveCountry } = useShowroom.getState();
      
      // If in Main View (no country selected), scroll acts as clicking USA
      if (!activeCountry) {
        setActiveCountry('USA');
        return;
      }
      
      // If a country is selected, handle part navigation
      const { currentShotIndex } = useShowroom.getState();
      const delta = event.deltaY > 0 ? 1 : -1;
      const part = currentPart();
      
      if (!part) return;
      
      // Simple index cycling for now
      const maxIndex = 1; // Will be dynamic with actual car parts
      const newIndex = Math.max(0, Math.min(maxIndex, currentShotIndex + delta));
      setCurrentShotIndex(newIndex);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [setCurrentShotIndex, currentPart]);

  // Opportunistic GLB prefetch (HTTP cache warm-up). This improves perceived speed on slow networks.
  useEffect(() => {
    const glbs = [
      '/modules/cars/2018-Honda-Civic-Type-R-3D.glb',
      '/modules/cars/Porsche911CarreraGTS.glb',
      '/modules/cars/corvette.glb',
    ];
    glbs.forEach((url) => {
      // Use fetch with low priority; ignore errors
      fetch(url, { method: 'GET', mode: 'cors', cache: 'force-cache' }).catch(() => {});
    });
  }, []);

  // Auto-dismiss warm overlay once the next frame after mount, giving preloads a head start
  useEffect(() => {
    const t = setTimeout(() => setIsWarming(false), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen overflow-hidden">
      {/* 3D Background Canvas */}
      <ShowroomCanvas />
      {/* Global showroom dimmer overlay (dims Canvas/background only, not UI) */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        aria-hidden
        style={{ backgroundColor: `rgba(0,0,0,${Math.max(0, Math.min(1, 1 - brightness))})` }}
      />
      
      {/* UI Layer */}
  <div className="relative z-10">
        <Navbar />
        
        <GlassSidebar countries={countries} />
        
        <CarDataHUD />
        
        <Footer />

        {/* Warm-up overlay (brief) */}
        {isWarming && (
          <div className="fixed inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="glass-strong rounded-2xl px-6 py-4 text-center">
              <div className="title-section text-luxury">Preparing Showroom</div>
              <div className="body-elegant text-[hsl(var(--muted-foreground))] mt-1">Optimizing assets…</div>
            </div>
          </div>
        )}
        
        {/* Welcome Animation */}
        <motion.div
          className="fixed inset-0 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 2, delay: 1.5 }}
        >
          <motion.div
            className="glass-strong rounded-2xl p-8 text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <h2 className="title-display text-luxury mb-2">
              Welcome to Elite
            </h2>
            <p className="body-elegant text-secondary-foreground">
              Experience automotive excellence
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
