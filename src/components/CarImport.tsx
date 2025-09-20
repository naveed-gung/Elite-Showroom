import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useShowroom } from '../store/useShowroom';

// Slight rearward nudge to visually center on platform
const PLATFORM_POSITION: [number, number, number] = [8, 0.5, 5.6]; // Base platform position
const CAMERA_POSITION: [number, number, number] = [8, 0.5, 6]; // Forward position for camera stages
const FRONT_FACING_ROTATION = Math.PI; // This will make headlights face the camera

const CarImport: React.FC = () => {
	const glbPath = '/modules/cars/2018-Honda-Civic-Type-R-3D.glb';
	const { scene } = useGLTF(glbPath);
	const carRef = useRef<THREE.Group>(null);
	const innerGroupRef = useRef<THREE.Group>(null);
	const { activeCountry } = useShowroom();
	const [currentStage, setCurrentStage] = useState(0);
	
	// Create a standalone clone of the scene to avoid external influences
	const carScene = useMemo(() => scene.clone(true), [scene]);
	
	// Center and scale car
	useEffect(() => {
		if (!carScene) return;
		
		// Center car and prepare it
		centerAndPrepareModel(carScene);
	}, [carScene]);
	
	// Listen to camera stage changes when Japan is active
	useEffect(() => {
		if (activeCountry !== 'Japan') {
			setCurrentStage(0);
			return;
		}
		
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'ArrowUp') {
				setCurrentStage(prev => (prev + 1) % 4);
			} else if (e.key === 'ArrowDown') {
				setCurrentStage(prev => (prev - 1 + 4) % 4);
			}
		};
		
		const handleWheel = (e: WheelEvent) => {
			if (e.deltaY < 0) {
				setCurrentStage(prev => (prev + 1) % 4);
			} else if (e.deltaY > 0) {
				setCurrentStage(prev => (prev - 1 + 4) % 4);
			}
		};
		
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('wheel', handleWheel);
		
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('wheel', handleWheel);
		};
	}, [activeCountry]);
	
		// Animation loop with simplified rotation and hard-lock root at platform center
	useFrame((state) => {
			if (!carRef.current || !innerGroupRef.current) return;
			// Keep the root exactly centered on the display platform
			carRef.current.position.set(...PLATFORM_POSITION);
		
		// Define rotation constants
		const ROTATION_PERIOD = 10; // seconds for a complete 360° rotation - adjust this to match LED rim speed
		
		if (activeCountry === 'Japan') {
			// When Japan is active, face the car forward (towards camera)
			// Use smoothing to gradually rotate to this position
			const targetRotation = FRONT_FACING_ROTATION; // Forward-facing rotation
			const currentRotation = innerGroupRef.current.rotation.y;
			const diff = targetRotation - currentRotation;
			
			// Smooth rotation to front position with proper angle handling
			// Calculate the shortest path to target angle (handling the wrap-around)
			let shortestDiff = ((diff % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
			if (shortestDiff > Math.PI) shortestDiff -= Math.PI * 2;
			
			// Apply smooth rotation towards front-facing position
			if (Math.abs(shortestDiff) > 0.01) {
				innerGroupRef.current.rotation.y += shortestDiff * 0.05;
			} else {
				innerGroupRef.current.rotation.y = targetRotation;
			}
		} else {
			// For other countries, continuous rotation based on time
			// This ensures consistent speed regardless of framerate
			const time = state.clock.getElapsedTime();
			const rotation = (time % ROTATION_PERIOD) / ROTATION_PERIOD * Math.PI * 2;
			innerGroupRef.current.rotation.y = rotation;
		}
	});
	
		// Center the model and prepare it for display
	const centerAndPrepareModel = (model: THREE.Object3D) => {
		// Enable shadows and prepare materials
		model.traverse((child: THREE.Object3D) => {
			if (child instanceof THREE.Mesh) {
				child.castShadow = true;
				child.receiveShadow = true;
				if (child.geometry && !child.geometry.boundingBox) {
					child.geometry.computeBoundingBox();
				}
				
				// Fix materials and make tires black
				const mats = Array.isArray(child.material) ? child.material : [child.material];
				mats.forEach((m) => { 
					if (m) {
						m.side = THREE.DoubleSide;
						
						// Check if this is a tire material and make it black
						const materialName = (m.name || '').toLowerCase();
						const meshName = (child.name || '').toLowerCase();
						
							// Handle windshield / glass transparency from inside
							const isGlass =
								materialName.includes('glass') ||
								materialName.includes('windshield') ||
								materialName.includes('window') ||
								meshName.includes('glass') ||
								meshName.includes('windshield') ||
								meshName.includes('window');

							// Only apply glass override if a special flag is set on the window (opt-in)
							// Support both legacy (VELARE) and new (ELITE) flags
							const w = (window as unknown as Record<string, unknown>);
							const legacyFlag = typeof w.__VELARE_GLASS_OVERRIDE__ === 'boolean' ? Boolean(w.__VELARE_GLASS_OVERRIDE__) : undefined;
							const newFlag = typeof w.__ELITE_GLASS_OVERRIDE__ === 'boolean' ? Boolean(w.__ELITE_GLASS_OVERRIDE__) : undefined;
							const allowGlassOverride = (newFlag ?? legacyFlag) ?? false;
							if (isGlass && allowGlassOverride) {
								if (m instanceof THREE.MeshPhysicalMaterial) {
									m.transparent = true;
									m.opacity = 0.1; // very transparent from inside
									m.transmission = 0.95; // strong transmission for clear glass
									m.roughness = Math.min(m.roughness ?? 0.15, 0.2);
									m.metalness = Math.min(m.metalness ?? 0.0, 0.05);
									m.clearcoat = 0.6;
									m.clearcoatRoughness = 0.2;
									m.depthWrite = false; // avoid black occlusion from inside
									m.envMapIntensity = 0.4;
								} else if (m instanceof THREE.MeshStandardMaterial) {
									m.transparent = true;
									m.opacity = 0.15;
									m.roughness = Math.min(m.roughness ?? 0.2, 0.25);
									m.metalness = Math.min(m.metalness ?? 0.0, 0.05);
									m.depthWrite = false;
									m.envMapIntensity = 0.35;
								}
							}

						if (materialName.includes('tire') || 
							materialName.includes('wheel') ||
							materialName.includes('rubber') ||
							meshName.includes('tire') ||
							meshName.includes('wheel')) {
							
							// Make tire materials black
							if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial) {
								m.color.setHex(0x1a1a1a); // Dark black for tires
								m.roughness = 0.9;
								m.metalness = 0.1;
							}
						}
					}
				});
			}
			child.frustumCulled = false; // Prevent culling
		});
	};
	
	// Scale and auto-center the car for proper display
	const autoScaleAndCenter = useMemo(() => {
		if (!carScene) return { scale: 1.5, offset: [0, 0, 0] };
		
		// Reset transforms for accurate measurement
		carScene.position.set(0, 0, 0);
		carScene.rotation.set(0, 0, 0);
		carScene.scale.set(1, 1, 1);
		carScene.updateMatrixWorld(true);
		
		// Calculate bounding box from meshes only
		const box = new THREE.Box3();
		let hasMesh = false;
		
		carScene.traverse((child: THREE.Object3D) => {
			if ((child as THREE.Mesh).isMesh) {
				hasMesh = true;
				child.updateWorldMatrix(true, false);
				box.expandByObject(child);
			}
		});
		
		// Default values if calculation fails
		let scale = 1.5; // Increased default scale from 1.2 to 1.8
		const offset = [0, 0, 0];
		
		// Calculate proper scale and offset
		if (hasMesh && !box.isEmpty()) {
			const size = box.getSize(new THREE.Vector3());
			const footprint = Math.max(size.x, size.z);
			const targetFootprint = 3.0; // Increased from 2.5 to 3.5 for a larger car
			
			if (footprint > 0) {
				scale = targetFootprint / footprint;
				scale = Math.max(0.5, Math.min(scale, 4)); // Increased min and max scale
			}
			
			// Calculate centering offset
			const center = box.getCenter(new THREE.Vector3());
			const min = box.min.clone();
			offset[0] = -center.x;
			offset[1] = -min.y; 
			offset[2] = -center.z;
		}
		
		return { scale, offset };
	}, [carScene]);

		// Always keep car centered on the display platform (no forward nudge)
		const carPosition = useMemo(() => {
			return PLATFORM_POSITION;
		}, []);

	return (
		<group
			ref={carRef}
			name="HondaFK8Root"
			position={carPosition}
		>
			{/* Apply rotation to inner group for better control */}
			<group ref={innerGroupRef}>
				<primitive
					object={carScene}
					scale={[
						autoScaleAndCenter.scale * 1.4, // Increase X scale by 40%
						autoScaleAndCenter.scale * 1.4, // Increase Y scale by 40%
						autoScaleAndCenter.scale * 1.4  // Increase Z scale by 40%
					]}
					position={autoScaleAndCenter.offset as [number, number, number]}
				/>
			</group>

		</group>
	);
};

useGLTF.preload('/modules/cars/2018-Honda-Civic-Type-R-3D.glb');

export default CarImport;

