import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useShowroom } from '../store/useShowroom';

// Slight rearward nudge to visually center on platform
const PLATFORM_POSITION: [number, number, number] = [-8, 0.5, 5.6];
const CAMERA_POSITION: [number, number, number] = [-8, 0.5, 3];
// Fixed yaw to face showroom entrance (adjust if needed)
const ENTRANCE_YAW = Math.PI; // face toward -Z

const GermanyCarImport: React.FC = () => {
  const glbPath = '/modules/cars/Porsche911CarreraGTS.glb';
  const { scene } = useGLTF(glbPath);
  const carRef = useRef<THREE.Group>(null);
  const innerGroupRef = useRef<THREE.Group>(null);
  const { activeCountry } = useShowroom();
  const [currentStage, setCurrentStage] = useState(0);

  const carScene = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    if (!carScene) return;
    centerAndPrepareModel(carScene);
  }, [carScene]);

  // Stage navigation (mirrors Japan logic)
  useEffect(() => {
    if (activeCountry !== 'Germany') {
      setCurrentStage(0);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') setCurrentStage((s) => (s + 1) % 4);
      if (e.key === 'ArrowDown') setCurrentStage((s) => (s - 1 + 4) % 4);
    };
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) setCurrentStage((s) => (s + 1) % 4);
      else if (e.deltaY > 0) setCurrentStage((s) => (s - 1 + 4) % 4);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
    };
  }, [activeCountry]);

  // Keep car steady when Germany is active; otherwise rotate slowly for ambient motion
  useFrame((state) => {
    // Keep the root exactly centered on the display platform
    if (carRef.current) {
      carRef.current.position.set(...PLATFORM_POSITION);
    }
    if (!innerGroupRef.current) return;
    const ROTATION_PERIOD = 10;
    if (activeCountry !== 'Germany') {
      const time = state.clock.getElapsedTime();
      innerGroupRef.current.rotation.y = (time % ROTATION_PERIOD) / ROTATION_PERIOD * Math.PI * 2;
    }
  });

  // When Germany is active, fix yaw to entrance and hold it
  useEffect(() => {
    if (!innerGroupRef.current) return;
    if (activeCountry === 'Germany') {
      innerGroupRef.current.rotation.y = ENTRANCE_YAW;
    }
  }, [activeCountry]);

  const centerAndPrepareModel = (model: THREE.Object3D) => {
    model.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.geometry && !mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.Material[];
        mats.forEach((m) => {
          if (!m) return;
          if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial) {
            m.side = THREE.DoubleSide;
          }
        });
      }
      child.frustumCulled = false;
    });
  };

  const autoScaleAndCenter = useMemo(() => {
    if (!carScene) return { scale: 1.5, offset: [0, 0, 0] as [number, number, number] };
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
      const targetFootprint = 3.0;
      if (footprint > 0) scale = Math.max(0.5, Math.min(3.5, targetFootprint / footprint));
      const center = box.getCenter(new THREE.Vector3());
      const min = box.min.clone();
      offset[0] = -center.x;
      offset[1] = -min.y;
      offset[2] = -center.z;
    }
    return { scale, offset };
  }, [carScene]);

  const carPosition = useMemo(() => {
    // Always remain centered on the display platform for Germany, even when zoomed
    return PLATFORM_POSITION;
  }, []);

  return (
    <group ref={carRef} name="Porsche911Root" position={carPosition}>
      <group ref={innerGroupRef}>
        <primitive object={carScene} scale={[autoScaleAndCenter.scale * 1.4, autoScaleAndCenter.scale * 1.4, autoScaleAndCenter.scale * 1.4]} position={autoScaleAndCenter.offset} />
      </group>
    </group>
  );
};

useGLTF.preload('/modules/cars/Porsche911CarreraGTS.glb');

export default GermanyCarImport;
