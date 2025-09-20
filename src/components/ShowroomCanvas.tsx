import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { useShowroom } from '../store/useShowroom';
import ShowroomImport from './ShowroomImport';
import CarImport from './CarImport';
import GermanyCarImport from './GermanyCarImport';
import USADisplayPlatform from './USADisplayPlatform';
import CameraController from './CameraController';
import CarStageOverlay from './CarStageOverlay';
import BrightnessControl from './BrightnessControl';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';

const ShowroomLighting: React.FC = () => {
  const areaLightRef = useRef<THREE.RectAreaLight>(null);
  const { lightBootDone, setLightBootDone, brightness } = useShowroom();
  const steadyIntensity = 0.25; // base area light intensity after boot

  useEffect(() => {
    if (!areaLightRef.current || lightBootDone) return;

    // Light boot sequence - flickering effect
    const light = areaLightRef.current;
    const bootSequence: NodeJS.Timeout[] = [];
    
    // Initial flicker sequence - dimmed
    const flickerPattern = [
      { intensity: 0, delay: 0 },
      { intensity: 0.5, delay: 100 },  // Reduced from 2 to 0.5
      { intensity: 0, delay: 200 },
      { intensity: 0.2, delay: 350 },  // Reduced from 0.8 to 0.2
      { intensity: 0, delay: 450 },
      { intensity: 0.4, delay: 600 },  // Reduced from 1.5 to 0.4
      { intensity: 0.1, delay: 800 },  // Reduced from 0.3 to 0.1
      { intensity: 0.3, delay: 1000 }, // Reduced from 1.2 to 0.3
      { intensity: 0.25, delay: 1200 }, // Final steady state - reduced from 1.0 to 0.25
    ];

  flickerPattern.forEach(({ intensity, delay }) => {
      const timeout = setTimeout(() => {
    light.intensity = intensity * brightness;
      }, delay);
      bootSequence.push(timeout);
    });

    // Mark boot as complete
    const finalTimeout = setTimeout(() => {
      // Settle to steady state scaled by brightness
      if (areaLightRef.current) areaLightRef.current.intensity = steadyIntensity * brightness;
      setLightBootDone(true);
    }, 1600);
    bootSequence.push(finalTimeout);

    return () => {
      bootSequence.forEach(clearTimeout);
    };
  }, [lightBootDone, setLightBootDone, brightness]);

  // React to brightness changes post-boot
  useEffect(() => {
    if (!areaLightRef.current) return;
    if (lightBootDone) {
      areaLightRef.current.intensity = steadyIntensity * brightness;
    }
  }, [brightness, lightBootDone]);

  return (
    <>
  <rectAreaLight ref={areaLightRef} position={[0, 4, 0]} args={[0xffffff, 0, 4, 3]} />
  <directionalLight position={[5, 3, 5]} intensity={0.15 * brightness} color="#ffffff" />
  <directionalLight position={[-5, 3, -2]} intensity={0.1 * brightness} color="#ffffff" />
  <ambientLight intensity={0.1 * brightness} color="#ffffff" />
  <spotLight position={[-8, 4, -6]} target-position={[-8, -6, 0]} intensity={0.3 * brightness} angle={Math.PI / 6} penumbra={0.3} color="#ffffff" castShadow />
  <spotLight position={[0, 4, -6]} target-position={[0, -6, 0]} intensity={0.3 * brightness} angle={Math.PI / 6} penumbra={0.3} color="#ffffff" castShadow />
  <spotLight position={[8, 4, -6]} target-position={[8, -6, 0]} intensity={0.3 * brightness} angle={Math.PI / 6} penumbra={0.3} color="#ffffff" castShadow />
    </>
  );
};

const ShowroomScene: React.FC = () => {
  const { activeCountry, visibleCountries } = useShowroom();
  // Preload heavy GLBs once at scene mount to warm caches (network + GPU)
  useGLTF.preload('/modules/cars/2018-Honda-Civic-Type-R-3D.glb');
  useGLTF.preload('/modules/cars/Porsche911CarreraGTS.glb');
  useGLTF.preload('/modules/cars/corvette.glb');
  
  return (
    <>
      <ShowroomLighting />
      <ShowroomImport country={activeCountry} />
      {visibleCountries.Japan !== false && <CarImport />}
      {visibleCountries.Germany !== false && <GermanyCarImport />}
      {visibleCountries.USA !== false && <USADisplayPlatform />}
      <CameraController />
      <Environment preset="studio" background={false} />
    </>
  );
};

const MacKeyboardOverlay: React.FC = () => {
  return (
    <div className="mac-keys-overlay" aria-hidden>
      <div className="mac-keys">
        <div className="mac-key mac-key-up animate-press">↑</div>
        <div className="mac-keys-row">
          <div className="mac-key">←</div>
          <div className="mac-key">↓</div>
          <div className="mac-key">→</div>
        </div>
      </div>
    </div>
  );
};

// Top-center W key hint (interior only)
const WTopCenterHint: React.FC = () => {
  const { cameraStage } = useShowroom();
  if (cameraStage !== 2) return null;
  return (
    <div className="w-hint-overlay" aria-hidden>
      <div className="w-hint">
        <div className="mac-key animate-press" title="Hold W to accelerate">W</div>
      </div>
    </div>
  );
};

// Mobile detection and orientation helpers
const useIsMobileLandscape = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);

  useEffect(() => {
    const update = () => {
      const coarse = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;
      const small = Math.min(window.innerWidth, window.innerHeight) < 820;
      setIsMobile(coarse || small);
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    update();
    window.addEventListener('resize', update);
    const onOrient: EventListener = () => update();
    window.addEventListener('orientationchange', onOrient);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', onOrient);
    };
  }, []);

  return { isMobile, isLandscape };
};

// On-screen mobile controls (visible only on mobile landscape)
const MobileControls: React.FC = () => {
  const { cameraStage } = useShowroom();
  const dispatch = (type: string) => window.dispatchEvent(new Event(type));
  const accelDown = useCallback(() => dispatch('showroom:accelerate:start'), []);
  const accelUp = useCallback(() => dispatch('showroom:accelerate:stop'), []);

  return (
    <div className="mobile-controls" role="group" aria-label="Showroom Controls">
      <button className="mc-btn" onClick={() => dispatch('showroom:stage:prev')} aria-label="Previous view">↑</button>
      <div className="mc-row">
        <button className="mc-btn" onClick={() => dispatch('showroom:stage:prev')} aria-label="Previous view">←</button>
        <button className="mc-btn" onClick={() => dispatch('showroom:stage:next')} aria-label="Next view">↓</button>
        <button className="mc-btn" onClick={() => dispatch('showroom:stage:next')} aria-label="Next view">→</button>
      </div>
      {cameraStage === 2 && (
        <button
          className="mc-btn mc-w"
          onMouseDown={accelDown}
          onMouseUp={accelUp}
          onTouchStart={(e) => { e.preventDefault(); accelDown(); }}
          onTouchEnd={(e) => { e.preventDefault(); accelUp(); }}
          aria-label="Accelerate"
        >W</button>
      )}
    </div>
  );
};

// Portrait rotate overlay with tap-to-lock attempt
const RotateOverlay: React.FC<{ onRequestLandscape: () => void }> = ({ onRequestLandscape }) => (
  <div className="rotate-overlay">
    <div className="rotate-card">
      <div className="rotate-icon" aria-hidden>↺</div>
      <div className="rotate-text">Rotate your device to landscape</div>
      <button className="mc-btn mc-w" onClick={onRequestLandscape} aria-label="Request landscape mode">Tap to continue</button>
    </div>
  </div>
);

const ShowroomCanvas: React.FC = () => {
  const { activeCountry } = useShowroom();
  const { isMobile, isLandscape } = useIsMobileLandscape();
  const requestLandscape = useCallback(async () => {
    try {
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void> | void;
        msRequestFullscreen?: () => Promise<void> | void;
      };
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else if (el.msRequestFullscreen) await el.msRequestFullscreen();
    } catch {
      // ignore
    }
    try {
      const orientationLike = (screen as unknown as {
        orientation?: { lock?: (o: 'landscape' | 'portrait' | 'any') => Promise<void> };
      }).orientation;
      if (orientationLike && orientationLike.lock) {
        await orientationLike.lock('landscape');
      }
    } catch {
      // ignore
    }
  }, []);
  return (
    <>
    <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Canvas 
        shadows
        camera={{ 
          position: [0, 8, 6], 
          fov: 50,
          rotation: [Math.PI * -30/180, 0, 0]
        }}
        gl={{ 
          antialias: true, 
          alpha: false,
          powerPreference: "high-performance"
        }}
      >
        <OrbitControls 
          enabled={false}
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
        />
        
        <ShowroomScene />
      </Canvas>
    </div>
  {!activeCountry && <BrightnessControl />}
  {(activeCountry === 'Japan' || activeCountry === 'Germany' || activeCountry === 'USA') && (
    <>
      <CarStageOverlay />
      {!isMobile && <MacKeyboardOverlay />}
  {!isMobile && <WTopCenterHint />}
  {isMobile && isLandscape && <MobileControls />}
  {isMobile && !isLandscape && <RotateOverlay onRequestLandscape={requestLandscape} />}
    </>
  )}
  </>
  );
};

export default ShowroomCanvas;
