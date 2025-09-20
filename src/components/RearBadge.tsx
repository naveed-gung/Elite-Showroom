import React, { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useShowroom } from '../store/useShowroom';

interface RearBadgeProps {
  country: 'Japan' | 'Germany' | 'USA';
  label: string; // e.g., "Honda Civic Type R"
  year: number;  // e.g., 2018
  anchor: [number, number, number]; // platform center
  rearDirZ: 1 | -1; // +1 for Germany, -1 for Japan/USA
}

const RearBadge: React.FC<RearBadgeProps> = ({ country, label, year, anchor, rearDirZ }) => {
  const { activeCountry, cameraStage } = useShowroom();
  const visible = activeCountry === country && cameraStage === 3;

  const platePos = useMemo<[number, number, number]>(() => {
    const [x, , z] = anchor;
    // Float a bit above ground, just behind the car in rear view
    return [x, 0.9, z + rearDirZ * 1.25];
  }, [anchor, rearDirZ]);

  // Face camera based on rear direction: Germany rear faces +Z (0 rad), Japan/USA rear faces -Z (PI rad)
  const rotationY = useMemo(() => (rearDirZ === 1 ? 0 : Math.PI), [rearDirZ]);

  if (!visible) return null;

  return (
    <group position={platePos} rotation={[0, rotationY, 0]} frustumCulled={false}>
      {/* Smoked glass plate */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[2.4, 0.6]} />
        <meshPhysicalMaterial
          color="#0a0a0a"
          roughness={0.35}
          metalness={0.05}
          transparent
          opacity={0.55}
          transmission={0.25}
          ior={1.2}
          thickness={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Text rendered as if etched or printed on the plate */}
      <Text
        position={[0, 0.02, 0.001]}
        fontSize={0.12}
        color="#e9ecef"
        outlineWidth={0.01}
        outlineColor="#141414"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.2}
      >
        {`${label}  —  ${year}`}
      </Text>
      {/* Subtle bottom accent bar for authenticity */}
      <mesh position={[0, -0.22, 0.001]}>
        <planeGeometry args={[2.2, 0.02]} />
        <meshStandardMaterial color="#a3a3a3" roughness={0.7} metalness={0.2} />
      </mesh>
    </group>
  );
};

export default RearBadge;
