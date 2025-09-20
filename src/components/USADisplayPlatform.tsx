import React, { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useShowroom } from '../store/useShowroom';

// USA platform (center stage)
// Slight rearward nudge to visually center on platform
const PLATFORM_POSITION: [number, number, number] = [0, 0.5, 4.2];
// Fixed yaw to face showroom entrance (matches other cars)
const ENTRANCE_YAW = Math.PI; // face toward -Z

// Simple display platform for USA - just keeping the placeholder platform
const USADisplayPlatform: React.FC = () => {
  const glbPath = '/modules/cars/corvette.glb';
  const { scene } = useGLTF(glbPath);
  const rootRef = useRef<THREE.Group>(null);
  const innerGroupRef = useRef<THREE.Group>(null);
  const { activeCountry } = useShowroom();

  // Clone GLB scene so we can safely mutate materials
  const carScene = useMemo(() => scene.clone(true), [scene]);

  // No USA-side material overrides: import the GLB exactly as authored in Blender.

  // Auto-scale and ground the model on the platform
  const autoScaleAndCenter = useMemo(() => {
  if (!carScene) return { scale: 1.5, offset: [0, 0, 0] as [number, number, number], box: null as THREE.Box3 | null };
    carScene.position.set(0, 0, 0);
    carScene.rotation.set(0, 0, 0);
    carScene.scale.set(1, 1, 1);
    carScene.updateMatrixWorld(true);

    const box = new THREE.Box3();
    let hasMesh = false;
    carScene.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        hasMesh = true;
        child.updateWorldMatrix(true, false);
        box.expandByObject(child);
      }
    });

    let scale = 1.5;
    const offset: [number, number, number] = [0, 0, 0];
    if (hasMesh && !box.isEmpty()) {
      const size = box.getSize(new THREE.Vector3());
      const footprint = Math.max(size.x, size.z);
      const targetFootprint = 3.0; // match other platforms
      if (footprint > 0) scale = Math.max(0.5, Math.min(3.5, targetFootprint / footprint));
      const center = box.getCenter(new THREE.Vector3());
      const min = box.min.clone();
      offset[0] = -center.x;
      offset[1] = -min.y; // ground to Y=0
      offset[2] = -center.z;
    }
  return { scale, offset, box };
  }, [carScene]);

  // Spin car only when USA LED rim is spinning (i.e., when activeCountry !== 'USA')
  useFrame((state) => {
    // Hard-lock root group at platform center so model never drifts
    if (rootRef.current) {
      rootRef.current.position.set(...PLATFORM_POSITION);
      // No base yaw on root; inner group controls orientation
      rootRef.current.rotation.set(0, 0, 0);
    }
  if (!innerGroupRef.current) return;
  // Child group handles spin relative to base yaw
    // In ShowroomImport, the selected country's platform animation is stopped.
    // When USA is active, hold a fixed entrance-facing yaw.
    if (activeCountry === 'USA') {
      innerGroupRef.current.rotation.y = ENTRANCE_YAW;
      return;
    }
    const ROTATION_PERIOD = 10; // seconds per full turn (match other cars)
    const time = state.clock.getElapsedTime();
    innerGroupRef.current.rotation.y = (time % ROTATION_PERIOD) / ROTATION_PERIOD * Math.PI * 2;
  });

  return (
    <group ref={rootRef} name="USACarRoot" position={PLATFORM_POSITION}>
      <group>
        <group ref={innerGroupRef}>
          <primitive object={carScene} scale={[autoScaleAndCenter.scale * 1.4, autoScaleAndCenter.scale * 1.4, autoScaleAndCenter.scale * 1.4]} position={autoScaleAndCenter.offset} />
        </group>
      </group>
    </group>
  );
};

useGLTF.preload('/modules/cars/corvette.glb');

export default USADisplayPlatform;
