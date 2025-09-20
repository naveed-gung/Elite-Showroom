import React, { useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useShowroom } from '../store/useShowroom';
import * as THREE from 'three';

interface ShowroomImportProps {
  country: string;
}

const ShowroomImport: React.FC<ShowroomImportProps> = ({ country }) => {
  const { currentCar, activeCountry } = useShowroom();
  const { scene, animations } = useGLTF('/modules/showroom.glb');
  const { actions } = useAnimations(animations, scene);

  // Play animations with selective stopping
  useEffect(() => {
    if (actions) {
      // Play all available animations
      Object.entries(actions).forEach(([name, action]) => {
        if (action) {
          // If no country is selected (Main View), play all animations
          if (!activeCountry) {
            action.reset().fadeIn(0.5).play();
            action.setLoop(THREE.LoopRepeat, Infinity);
          } else {
            // If a country is selected, stop the corresponding platform animation
            if (name.toLowerCase().includes(activeCountry.toLowerCase())) {
              action.stop();
            } else {
              // Play other animations normally
              action.reset().fadeIn(0.5).play();
              action.setLoop(THREE.LoopRepeat, Infinity);
            }
          }
        }
      });
    }
  }, [actions, activeCountry]);

  // Enable shadows for all meshes
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [scene]);

  return (
    <primitive 
      object={scene} 
      position={[0, 0, 0]} 
      scale={[1, 1, 1]}
    />
  );
};

export default ShowroomImport;