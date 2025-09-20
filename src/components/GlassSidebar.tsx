import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShowroom } from '../store/useShowroom';
import { AiOutlineMenu, AiOutlineClose } from 'react-icons/ai';

interface GlassSidebarProps {
  countries: string[];
}

const GlassSidebar: React.FC<GlassSidebarProps> = ({ countries }) => {
  const { 
    activeCountry, 
    setActiveCountry, 
    isMobileSidebarOpen, 
    setMobileSidebarOpen,
    visibleCountries,
    toggleCountryVisible,
  } = useShowroom();

  const handleCountrySelect = (country: string) => {
    setActiveCountry(country);
    setMobileSidebarOpen(false); // Close mobile sidebar after selection
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <motion.button
        className="md:hidden fixed top-20 left-4 z-50 glass-strong rounded-full p-3 hover-lift"
        onClick={() => setMobileSidebarOpen(!isMobileSidebarOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isMobileSidebarOpen ? (
          <AiOutlineClose size={18} />
        ) : (
          <AiOutlineMenu size={18} />
        )}
      </motion.button>

      {/* Desktop Sidebar */}
      <motion.aside
        className="hidden md:block fixed left-sidebar-gap z-40 glass-strong rounded-3xl hover-glow backdrop-blur-xl"
        style={{
          top: 'calc(var(--navbar-height) + var(--sidebar-gap) + 8rem)',
          bottom: 'calc(var(--footer-height) + var(--sidebar-gap) + 16rem)',
          width: '12rem',
        }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="h-full flex flex-col items-center justify-center space-y-4 p-3">
          {/* Main Camera Indicator */}
          <motion.button
              className={`w-full text-center py-3 rounded-xl text-sm font-medium tracking-wide transition-all duration-300 hover-lift ${
                !activeCountry
                  ? 'glass-active text-slate-100'
                  : 'hover:glass-strong text-slate-400 hover:text-slate-100'
              }`}
            onClick={() => handleCountrySelect('')}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Main View
          </motion.button>
          
          {countries.map((country, index) => (
            <motion.div
              key={country}
              className={`w-full flex items-center gap-2 ${
                activeCountry === country
                  ? 'glass-active text-slate-900'
                  : 'hover:glass-strong text-slate-400 hover:text-slate-100'
              } rounded-xl px-2 py-2`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: (index + 1) * 0.1 }}
            >
              <button
                className="flex-1 text-left py-1"
                onClick={() => handleCountrySelect(country)}
              >
                {country}
              </button>
              {/* Dev toggle: show/hide car */}
              <label className="flex items-center gap-1 text-xs select-none cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-slate-500 cursor-pointer"
                  checked={visibleCountries?.[country] ?? true}
                  onChange={() => toggleCountryVisible(country)}
                />
                <span className="text-slate-300">{visibleCountries?.[country] ? 'On' : 'Off'}</span>
              </label>
            </motion.div>
          ))}
        </div>
      </motion.aside>

      {/* Mobile Sidebar Sheet */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-xl z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
            />
            
            {/* Mobile Sheet */}
            <motion.div
              className="md:hidden fixed inset-x-4 top-32 bottom-20 glass rounded-2xl z-50 p-6"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div className="h-full flex flex-col space-y-3">
                <h2 className="title-section text-center mb-4">Select View</h2>
                
                {/* Main Camera Indicator */}
                <motion.button
                  className={`p-4 rounded-xl text-center font-medium tracking-wide transition-all duration-300 hover-lift ${
                    !activeCountry
                      ? 'glass-active text-slate-800'
                      : 'glass text-slate-600 hover:text-slate-800'
                  }`}
                  onClick={() => handleCountrySelect('')}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Main View
                </motion.button>
                
                <div className="flex-1 grid grid-cols-2 gap-3">
                  {countries.map((country, index) => (
                    <motion.button
                      key={country}
                      className={`p-4 rounded-xl text-center font-medium tracking-wide transition-all duration-300 hover-lift ${
                        activeCountry === country
                          ? 'glass-active text-slate-800'
                          : 'glass text-slate-600 hover:text-slate-800'
                      }`}
                      onClick={() => handleCountrySelect(country)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: (index + 1) * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {country}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default GlassSidebar;