import React, { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useShowroom } from '../store/useShowroom';
import * as THREE from 'three';

// Preset camera positions for non-Japan views
const cameraConfigs = {
  main: {
    position: [0, 2, -14] as [number, number, number],
    rotation: [Math.PI * 10 / 180, -Math.PI, 0] as [number, number, number],
    fov: 50,
  },
  Germany: {
    position: [-8, 2, -2] as [number, number, number],
    rotation: [0, Math.PI, 0] as [number, number, number],
    fov: 50,
  },
  Japan: {
    position: [8, 2, -2] as [number, number, number],
    rotation: [0, -Math.PI, 0] as [number, number, number],
    fov: 50,
  },
};

const CameraController: React.FC = () => {
  const { activeCountry, setActiveCountry, setCameraStage } = useShowroom();
  const { camera, scene } = useThree();
  const targetPosition = useRef(new THREE.Vector3());
  const targetRotation = useRef(new THREE.Euler());
  const isTransitioning = useRef(false);
  const hasIntroPlayed = useRef(false);
  // Acceleration (W) state
  const isAccelerating = useRef(false);
  const accelProgress = useRef(0); // 0..1
  const baseFov = useRef<number | null>(null);
  const frameTime = useRef(0);

  // Audio
  const audioListenerRef = useRef<THREE.AudioListener | null>(null);
  const audioLoaderRef = useRef<THREE.AudioLoader | null>(null);
  const engineAudioRef = useRef<Record<string, THREE.Audio | null>>({ Japan: null, Germany: null, USA: null });
  const lockSoundRef = useRef<THREE.Audio | null>(null);
  const unlockSoundRef = useRef<THREE.Audio | null>(null);

  const getEngineAudioUrl = useCallback((country: string) => {
    // Use provided car-specific audio files under public/modules/cars/audio
    if (country === 'Japan') return '/modules/cars/audio/honda.mp3';
    if (country === 'Germany') return '/modules/cars/audio/porsche.mp3';
    if (country === 'USA') return '/modules/cars/audio/chevrolet-corvette.mp3';
    return '';
  }, []);

  // Attach audio listener once
  useEffect(() => {
    if (!audioListenerRef.current) {
      const listener = new THREE.AudioListener();
      audioListenerRef.current = listener;
      camera.add(listener);
      audioLoaderRef.current = new THREE.AudioLoader();
    }
  }, [camera]);

  const ensureEngineAudio = useCallback((country: string, cb?: (aud: THREE.Audio | null) => void) => {
    if (!audioListenerRef.current || !audioLoaderRef.current) {
      cb?.(null); return;
    }
    const existing = engineAudioRef.current[country];
    if (existing) {
      cb?.(existing); return;
    }
  const url = getEngineAudioUrl(country);
    // Helper: synthesize a simple engine-like tone as fallback
    const synthFallback = () => {
  const listener = audioListenerRef.current!;
  const ctx: AudioContext | undefined = (listener as THREE.AudioListener).context as unknown as AudioContext;
      if (!ctx) { cb?.(null); return; }
      const sampleRate = ctx.sampleRate || 44100;
      const duration = 4; // seconds
      const channels = 1;
      const frameCount = Math.floor(sampleRate * duration);
      const buffer = ctx.createBuffer(channels, frameCount, sampleRate);
      const data = buffer.getChannelData(0);
      // Base engine timbre: sum of few harmonics with slight noise
      const baseFreq = 90; // idle-ish
      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        const x =
          Math.sin(2 * Math.PI * baseFreq * t) * 0.6 +
          Math.sin(2 * Math.PI * baseFreq * 2 * t) * 0.25 +
          Math.sin(2 * Math.PI * baseFreq * 3 * t) * 0.15;
        const noise = (Math.random() * 2 - 1) * 0.05;
        // Simple envelope to avoid clicks at loop point
        const env = 0.5 + 0.5 * Math.sin(2 * Math.PI * (1 / duration) * t);
        data[i] = (x + noise) * 0.6 * env;
      }
      const audio = new THREE.Audio(listener);
      audio.setBuffer(buffer);
      audio.setLoop(true);
      audio.setVolume(0.0);
      audio.setPlaybackRate(1.0);
      engineAudioRef.current[country] = audio;
      cb?.(audio);
    };

    if (!url) {
      synthFallback();
      return;
    }
    audioLoaderRef.current.load(
      url,
  (buffer) => {
        const audio = new THREE.Audio(audioListenerRef.current!);
        audio.setBuffer(buffer);
        audio.setLoop(true);
        audio.setVolume(0.0);
        audio.setPlaybackRate(1.0);
        engineAudioRef.current[country] = audio;
        cb?.(audio);
      },
      undefined,
      (err) => {
        console.warn('Engine audio load failed', url, err);
        // Fallback to synthesized buffer
        synthFallback();
      }
    );
  }, [getEngineAudioUrl]);

  // Load lock/unlock audio from files; synthesize only if loading fails
  const ensureLockUnlockAudio = useCallback(() => {
    if (!audioListenerRef.current || !audioLoaderRef.current) return;
    const listener = audioListenerRef.current;
    const loader = audioLoaderRef.current;

    const loadOnce = (path: string, ref: React.MutableRefObject<THREE.Audio | null>, vol = 0.9) => {
      if (ref.current) return;
      loader.load(
        path,
        (buffer) => {
          const a = new THREE.Audio(listener);
          a.setBuffer(buffer);
          a.setLoop(false);
          a.setVolume(vol);
          ref.current = a;
        },
        undefined,
        () => {
          // Fallback: quick synthesized chirp
          const ctx: AudioContext | undefined = (listener as THREE.AudioListener).context as unknown as AudioContext;
          if (!ctx) return;
          const duration = 0.22;
          const sampleRate = ctx.sampleRate || 44100;
          const frameCount = Math.floor(sampleRate * duration);
          const buffer = ctx.createBuffer(1, frameCount, sampleRate);
          const data = buffer.getChannelData(0);
          const up = path.includes('unlock');
          const f0 = up ? 800 : 1200;
          const f1 = up ? 1600 : 600;
          for (let i = 0; i < frameCount; i++) {
            const t = i / sampleRate;
            const f = f0 * Math.pow(f1 / f0, t / duration);
            const env = Math.min(1, t / 0.02) * Math.pow(1 - t / duration, 0.6);
            data[i] = Math.sin(2 * Math.PI * f * t) * 0.5 * env;
          }
          const a = new THREE.Audio(listener);
          a.setBuffer(buffer);
          a.setLoop(false);
          a.setVolume(vol);
          ref.current = a;
        }
      );
    };

    loadOnce('/modules/cars/audio/lock.wav', lockSoundRef, 0.9);
    loadOnce('/modules/cars/audio/unlock.wav', unlockSoundRef, 0.9);
  }, []);

  // Japan stages: 0 Front (default), 1 Side, 2 Interior facing showroom, 3 Rear
  const stageIndex = useRef(0);
  const maxStage = 3;

  // Helper: find GLTF stage cameras but ONLY within the active car's subtree to avoid cross-car interference
  const findStageCameraUnderActiveCar = useCallback((stage: number): THREE.Camera | undefined => {
    if (!carRootRef.current) return undefined;
    // Map stage -> name hint
    let key: 'overview' | 'hood' | 'interior' | 'rear' | 'moving' = 'hood';
    if (stage === 2) key = 'interior';
    else if (stage === 3) key = 'rear';
    else if (stage === 1) key = 'moving';
    else key = 'hood';
    let found: THREE.Camera | undefined;
    carRootRef.current.traverse((obj) => {
      if (found) return;
      const cam = obj as THREE.Camera;
      if ((cam as THREE.Camera).isCamera) {
        const name = (cam.name || '').toLowerCase();
        if (name.includes(key)) found = cam;
      }
    });
    return found;
  }, []);

  // Car root anchor (per-country)
  const carRootRef = useRef<THREE.Object3D | null>(null);
  const getAnchorName = useCallback((country: string) => {
    if (country === 'Japan') return 'HondaFK8Root';
    if (country === 'Germany') return 'Porsche911Root';
  if (country === 'USA') return 'USACarRoot';
    return '';
  }, []);

  useEffect(() => {
    const anchorName = getAnchorName(activeCountry);
    carRootRef.current = (anchorName ? scene.getObjectByName(anchorName) : null) || null;
  }, [scene, activeCountry, getAnchorName]);

  // Default anchor when car root is missing
  const getDefaultAnchor = useCallback(() => {
    // Match platform centers (z = 4 on all platforms)
    if (activeCountry === 'Japan') return new THREE.Vector3(8, 0.5, 4);
    if (activeCountry === 'Germany') return new THREE.Vector3(-8, 0.5, 4);
  if (activeCountry === 'USA') return new THREE.Vector3(0, 0.5, 4);
    // Return center position as a placeholder
    return new THREE.Vector3(0, 0.5, 4);
  }, [activeCountry]);

  // Simple mobile detection
  const isMobile = useRef<boolean>(false);
  useEffect(() => {
    const hasCoarsePointer = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;
    const smallViewport = typeof window !== 'undefined' ? Math.min(window.innerWidth, window.innerHeight) < 768 : false;
    isMobile.current = hasCoarsePointer || smallViewport;
  }, []);

  // Per-country interior seat configs to ensure driver-side placement and showroom-facing orientation
  const interiorConfigs = useRef<Record<string, {
    seatY: number;
    seatLateral: number; // meters
    seatForward: number; // meters (toward dash if negative when looking to showroom)
    fov: number;
    extraTiltDeg: number; // slight down-tilt
    lateralSign: 1 | -1; // +1 => showroomRight, -1 => showroomLeft
  }>>({
    // Push back a bit (negative seatForward) to reveal steering wheel, and set driver side per country
  Germany: { seatY: 0.92, seatLateral: 0.40, seatForward: -0.25, fov: 50, extraTiltDeg: 8, lateralSign: -1 }, // LHD -> left side (-X)
  USA: { seatY: 0.80, seatLateral: 0.48, seatForward: -0.35, fov: 50, extraTiltDeg: 8, lateralSign: -1 },    // LHD -> left side (-X), deeper in cabin
  Japan: { seatY: 0.95, seatLateral: 0.45, seatForward: -0.15, fov: 50, extraTiltDeg: 8, lateralSign: -1 },    // RHD -> right side (+X), slightly further back
  });

  // Compute interior seat position using steering wheel side if available
  const computeInteriorSeatPosition = useCallback((country: string) => {
    const anchor = new THREE.Vector3();
    if (carRootRef.current) {
      carRootRef.current.updateWorldMatrix(true, false);
      carRootRef.current.getWorldPosition(anchor);
    } else {
      anchor.copy(getDefaultAnchor());
    }

    const up = new THREE.Vector3(0, 1, 0);
    const showroomForward = new THREE.Vector3(0, 0, -1);
    const showroomRight = new THREE.Vector3(1, 0, 0);
    const showroomLeft = showroomRight.clone().multiplyScalar(-1);
    const cfg = interiorConfigs.current[country] || interiorConfigs.current.Germany;

    // Try to detect driver side by locating steering wheel under the active car root
    let lateral = cfg.lateralSign; // fallback
    if (carRootRef.current) {
      let steeringPos: THREE.Vector3 | null = null;
      carRootRef.current.traverse((obj) => {
        if (steeringPos) return;
        const n = (obj.name || '').toLowerCase();
        if (n.includes('steering') || n.includes('steer')) {
          const p = new THREE.Vector3();
          obj.updateWorldMatrix(true, false);
          (obj as THREE.Object3D).getWorldPosition(p);
          steeringPos = p;
        }
      });
      if (steeringPos) {
        // Compare to anchor in world X to decide left/right
        lateral = steeringPos.x >= anchor.x ? 1 : -1;
      }
    }

    const lateralAxis = lateral === 1 ? showroomRight : showroomLeft;
    const seatPos = anchor.clone()
      .add(up.clone().multiplyScalar(cfg.seatY))
      .add(lateralAxis.clone().multiplyScalar(cfg.seatLateral))
      .add(showroomForward.clone().multiplyScalar(cfg.seatForward));

    const lookTarget = seatPos.clone().add(showroomForward.clone().multiplyScalar(8));
    return { seatPos, lookTarget, cfg };
  }, [getDefaultAnchor]);

  // Compute fallback stage camera from car anchor
  const computeFallbackStage = useCallback((stage: number) => {
    const anchor = new THREE.Vector3();
    if (carRootRef.current) {
      carRootRef.current.updateWorldMatrix(true, false);
      carRootRef.current.getWorldPosition(anchor);
    } else {
      anchor.copy(getDefaultAnchor());
    }

    const pos = new THREE.Vector3();
    let fov = 50;
    let lookAtTarget = anchor.clone(); // Default: look at car

    // Build a stable basis aligned to showroom instead of relying on car root rotation (which differs across cars)
    const up = new THREE.Vector3(0, 1, 0);
    const showroomForward = new THREE.Vector3(0, 0, -1); // toward entrance
    const showroomRight = new THREE.Vector3(1, 0, 0); // +X is right when facing -Z
    const showroomLeft = showroomRight.clone().multiplyScalar(-1);

    switch (stage) {
      case 0: // Front: stand in front of the car (entrance side), facing it
        pos.copy(anchor)
          .add(up.clone().multiplyScalar(1.6))
          .add(showroomForward.clone().multiplyScalar(5.5));
        fov = 45;
        break;
      case 1: // Side: offset to world-right of platform
        pos.copy(anchor)
          .add(up.clone().multiplyScalar(1.6))
          .add(showroomRight.clone().multiplyScalar(5.5));
        fov = 50;
        break;
      case 2: { // Interior: place on driver's side and face the showroom
        const { seatPos, lookTarget, cfg } = computeInteriorSeatPosition(activeCountry);
        pos.copy(seatPos);
        lookAtTarget = lookTarget;
        fov = cfg.fov;
        break;
      }
      case 3: // Rear: stand behind the car (opposite entrance), looking toward it
      default:
        pos.copy(anchor)
          .add(up.clone().multiplyScalar(1.6))
          .add(showroomForward.clone().multiplyScalar(-5.5));
        fov = 50;
        break;
    }

    // Build look-at rotation
    const mat = new THREE.Matrix4().lookAt(pos, lookAtTarget, up);
    const quat = new THREE.Quaternion().setFromRotationMatrix(mat).invert();
    const euler = new THREE.Euler().setFromQuaternion(quat, 'XYZ');

    return { position: pos, rotation: euler, fov };
  }, [activeCountry, getDefaultAnchor, computeInteriorSeatPosition]);

  // Apply stage target using GLTF cameras under the active car when available, else fallback
  const applyStageTarget = useCallback((stage: number) => {
    // Prefer GLTF cameras within this car's subtree when available
  const stageCam: THREE.Camera | undefined = findStageCameraUnderActiveCar(stage);

    if (stageCam) {
      const worldPos = new THREE.Vector3();
      stageCam.updateWorldMatrix(true, false);
      stageCam.getWorldPosition(worldPos);

      // Build orientation to look at the car (or forward for interior)
      const anchor = new THREE.Vector3();
      if (carRootRef.current) {
        carRootRef.current.updateWorldMatrix(true, false);
        carRootRef.current.getWorldPosition(anchor);
      } else {
        anchor.copy(getDefaultAnchor());
      }
      const dummy = new THREE.Object3D();
      dummy.position.copy(worldPos);
      dummy.lookAt(anchor);

      // Interior: override camera to driver's seat and face the showroom consistently
      if (stage === 2) {
        const { seatPos, lookTarget, cfg } = computeInteriorSeatPosition(activeCountry);
        worldPos.copy(seatPos);
        dummy.position.copy(seatPos);
        dummy.lookAt(lookTarget);
        const euler = new THREE.Euler().setFromQuaternion(dummy.quaternion, 'YXZ');
        euler.x -= Math.PI * ((cfg.extraTiltDeg) / 180);
        euler.z = 0;
        dummy.quaternion.setFromEuler(euler);
      }

      targetPosition.current.copy(worldPos);
      targetRotation.current.setFromQuaternion(dummy.quaternion);

      const persp = camera as THREE.PerspectiveCamera;
      if (persp instanceof THREE.PerspectiveCamera) {
        const srcFov = (stageCam as THREE.PerspectiveCamera).fov || 50;
        persp.fov = srcFov;
        persp.updateProjectionMatrix();
      }
    } else {
      const fb = computeFallbackStage(stage);
      targetPosition.current.copy(fb.position);
      targetRotation.current.copy(fb.rotation);
      const persp = camera as THREE.PerspectiveCamera;
      if (persp instanceof THREE.PerspectiveCamera) {
        persp.fov = fb.fov;
        persp.updateProjectionMatrix();
      }
    }

    isTransitioning.current = true;
    setCameraStage(stage);
  }, [camera, computeFallbackStage, getDefaultAnchor, activeCountry, setCameraStage, findStageCameraUnderActiveCar, computeInteriorSeatPosition]);

  // Keyboard and scroll navigation (always enabled to ensure reliability across devices)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
  if (activeCountry === 'Japan' || activeCountry === 'Germany' || activeCountry === 'USA') {
        if (key === 'ArrowUp' || key === 'ArrowDown') e.preventDefault();
        if (key === 'ArrowUp') {
          stageIndex.current = (stageIndex.current + 1) % (maxStage + 1); // Wrap from 3 to 0
          applyStageTarget(stageIndex.current);
          return;
        }
        if (key === 'ArrowDown') {
          stageIndex.current = (stageIndex.current - 1 + maxStage + 1) % (maxStage + 1); // Wrap from 0 to 3
          applyStageTarget(stageIndex.current);
          return;
        }

        // Acceleration (W) in interior stage
        if ((key === 'w' || key === 'W') && stageIndex.current === 2) {
          e.preventDefault();
          if (!isAccelerating.current) {
            isAccelerating.current = true;
            // Start or resume audio
            ensureEngineAudio(activeCountry, (aud) => {
              if (!aud) return;
              if (!aud.isPlaying) aud.play();
            });
          }
          return;
        }
      }

      // Sidebar navigation when not in Japan
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        e.preventDefault();
        const order = ['', 'Germany', 'USA', 'Japan'];
        const currentIdx = Math.max(0, order.indexOf(activeCountry));
        const nextIdx = key === 'ArrowUp' ? Math.max(0, currentIdx - 1) : Math.min(order.length - 1, currentIdx + 1);
        const next = order[nextIdx];
        if (next !== activeCountry) setActiveCountry(next);
      }
    };

  const onWheel = (e: WheelEvent) => {
      // Prevent page scroll when using stage navigation
      if (activeCountry === 'Japan' || activeCountry === 'Germany' || activeCountry === 'USA') {
        e.preventDefault();
      }
  if (activeCountry === 'Japan' || activeCountry === 'Germany' || activeCountry === 'USA') {
        if (e.deltaY < 0) {
          stageIndex.current = (stageIndex.current + 1) % (maxStage + 1); // Wrap from 3 to 0
        } else if (e.deltaY > 0) {
          stageIndex.current = (stageIndex.current - 1 + maxStage + 1) % (maxStage + 1); // Wrap from 0 to 3
        }
        applyStageTarget(stageIndex.current);
      }
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key;
      if (key === 'w' || key === 'W') {
        isAccelerating.current = false;
      }
    };
    window.addEventListener('keyup', onKeyUp, { passive: true });
    // Use non-passive to allow preventDefault and stop page scrolling during stage navigation
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('wheel', onWheel);
  window.removeEventListener('keyup', onKeyUp);
    };
  }, [activeCountry, applyStageTarget, setActiveCountry, ensureEngineAudio]);

  // Mobile on-screen controls: listen for custom events
  useEffect(() => {
    const onNext = () => {
  if (!(activeCountry === 'Japan' || activeCountry === 'Germany' || activeCountry === 'USA')) return;
      stageIndex.current = (stageIndex.current + 1) % (maxStage + 1);
      applyStageTarget(stageIndex.current);
    };
    const onPrev = () => {
      if (!(activeCountry === 'Japan' || activeCountry === 'Germany' || activeCountry === 'USA')) return;
      stageIndex.current = (stageIndex.current - 1 + maxStage + 1) % (maxStage + 1);
      applyStageTarget(stageIndex.current);
    };
    const onAccelStart = () => {
      if (stageIndex.current !== 2) return;
      if (!isAccelerating.current) {
        isAccelerating.current = true;
        ensureEngineAudio(activeCountry, (aud) => {
          if (!aud) return;
          if (!aud.isPlaying) aud.play();
        });
      }
    };
    const onAccelStop = () => {
      isAccelerating.current = false;
    };

    const nextHandler: EventListener = () => onNext();
    const prevHandler: EventListener = () => onPrev();
    const accelStartHandler: EventListener = () => onAccelStart();
    const accelStopHandler: EventListener = () => onAccelStop();

    window.addEventListener('showroom:stage:next', nextHandler);
    window.addEventListener('showroom:stage:prev', prevHandler);
    window.addEventListener('showroom:accelerate:start', accelStartHandler);
    window.addEventListener('showroom:accelerate:stop', accelStopHandler);

    return () => {
      window.removeEventListener('showroom:stage:next', nextHandler);
      window.removeEventListener('showroom:stage:prev', prevHandler);
      window.removeEventListener('showroom:accelerate:start', accelStartHandler);
      window.removeEventListener('showroom:accelerate:stop', accelStopHandler);
    };
  }, [activeCountry, applyStageTarget, ensureEngineAudio]);

  // React to country changes
  const prevCountry = useRef<string>('');
  useEffect(() => {
    // Play lock on previous car, unlock on new car
    ensureLockUnlockAudio();
    const prev = prevCountry.current;
    const isCar = (c: string) => c === 'Japan' || c === 'Germany' || c === 'USA';
    if (prev && prev !== activeCountry && isCar(prev)) {
      const lock = lockSoundRef.current;
      if (lock) {
        try { lock.stop(); } catch (e) { /* noop */ }
        lock.play();
      }
      // Stop previous engine audio if any
      const prevAud = engineAudioRef.current[prev];
      if (prevAud && prevAud.isPlaying) {
        try { prevAud.stop(); } catch (e) { /* noop */ }
      }
    }
    if (isCar(activeCountry)) {
      const unlock = unlockSoundRef.current;
      if (unlock) {
        try { unlock.stop(); } catch (e) { /* noop */ }
        unlock.play();
      }
      // Preload engine audio for new car
      ensureEngineAudio(activeCountry, (aud) => {
        // For USA, play a subtle idle loop automatically
        if (activeCountry === 'USA' && aud && !aud.isPlaying) {
          aud.setVolume(0.18);
          aud.setPlaybackRate(1.0);
          aud.play();
        }
      });
    }
    prevCountry.current = activeCountry;

    // Reset transient camera state on country switch to avoid carrying over effects
    isAccelerating.current = false;
    accelProgress.current = 0;
    baseFov.current = null;

    if (activeCountry === 'Japan' || activeCountry === 'Germany' || activeCountry === 'USA') {
      // Ensure car root is updated before applying the stage
      const anchorName = getAnchorName(activeCountry);
      carRootRef.current = (anchorName ? scene.getObjectByName(anchorName) : null) || null;
      // Start from stage 0 (Front) so first and last stages align to Front/Rear as requested
      stageIndex.current = 0;
      // Defer one frame to let scene matrices settle
      requestAnimationFrame(() => applyStageTarget(stageIndex.current));
      return;
    }

    const config = activeCountry && cameraConfigs[activeCountry as keyof typeof cameraConfigs]
      ? cameraConfigs[activeCountry as keyof typeof cameraConfigs]
      : cameraConfigs.main;

    // Intro move (once): start at "door" then glide to Main View
    if (!activeCountry && !hasIntroPlayed.current) {
      const doorPos: [number, number, number] = [0, 2.0, 8.0];
      const doorRot: [number, number, number] = [Math.PI * 8/180, -Math.PI, 0];
      // Snap camera to door instantly
      camera.position.set(...doorPos);
      camera.rotation.set(...doorRot);
      const persp = camera as THREE.PerspectiveCamera;
      if (persp instanceof THREE.PerspectiveCamera) {
        persp.fov = config.fov;
        persp.updateProjectionMatrix();
      }
      // Set target to Main View and animate
      targetPosition.current.set(...config.position);
      targetRotation.current.set(...config.rotation);
      isTransitioning.current = true;
      hasIntroPlayed.current = true;
      return;
    }

    targetPosition.current.set(...config.position);
    targetRotation.current.set(...config.rotation);

    const persp = camera as THREE.PerspectiveCamera;
    if (persp instanceof THREE.PerspectiveCamera) {
      persp.fov = config.fov;
      persp.updateProjectionMatrix();
    }
    isTransitioning.current = true;
  }, [activeCountry, camera, applyStageTarget, ensureEngineAudio, ensureLockUnlockAudio, getAnchorName, scene]);

  // Cleanup on unmount: stop audios
  useEffect(() => {
    const engineSnapshot = { ...engineAudioRef.current };
    const lockSnap = lockSoundRef.current;
    const unlockSnap = unlockSoundRef.current;
    return () => {
      Object.values(engineSnapshot).forEach((aud) => {
        if (aud && aud.isPlaying) {
          try { aud.stop(); } catch (e) { /* noop */ }
        }
      });
      [lockSnap, unlockSnap].forEach((a) => {
        if (a && a.isPlaying) {
          try { a.stop(); } catch (e) { /* noop */ }
        }
      });
    };
  }, []);

  // Interpolate camera each frame
  useFrame((state, delta) => {
    frameTime.current += delta;
    if (isTransitioning.current) {
      const speed = 3.0;
      // Compute per-frame dynamic target (accel offset)
      const frameTarget = new THREE.Vector3().copy(targetPosition.current);
  if (stageIndex.current === 2 && (activeCountry === 'Japan' || activeCountry === 'Germany' || activeCountry === 'USA')) {
        // Apply forward push when accelerating
        if (isAccelerating.current || accelProgress.current > 0.001) {
          const forward = new THREE.Vector3();
          camera.getWorldDirection(forward);
          // getWorldDirection gives -Z axis; that's the viewing direction already
          const push = 0.15 + 0.35 * accelProgress.current;
          frameTarget.add(forward.multiplyScalar(push));
          // Subtle vertical bob
          frameTarget.y += Math.sin(frameTime.current * 9) * 0.015 * accelProgress.current;
        }
      }
      camera.position.lerp(frameTarget, delta * speed);

      const currentQ = new THREE.Quaternion().setFromEuler(camera.rotation);
      const targetQ = new THREE.Quaternion().setFromEuler(targetRotation.current);
      currentQ.slerp(targetQ, delta * speed);
      camera.rotation.setFromQuaternion(currentQ);

      const positionDiff = camera.position.distanceTo(targetPosition.current);
      const rotationDiff = Math.abs(camera.rotation.x - targetRotation.current.x) +
        Math.abs(camera.rotation.y - targetRotation.current.y) +
        Math.abs(camera.rotation.z - targetRotation.current.z);
      if (positionDiff < 0.01 && rotationDiff < 0.01) {
        isTransitioning.current = false;
      }
    }

  // Aim at the car anchor for all stages except interior so interior can face the showroom
  if ((activeCountry === 'Japan' || activeCountry === 'Germany' || activeCountry === 'USA') && stageIndex.current !== 2) {
      const anchor = new THREE.Vector3();
      if (carRootRef.current) {
        carRootRef.current.updateWorldMatrix(true, false);
        carRootRef.current.getWorldPosition(anchor);
      } else {
        anchor.copy(getDefaultAnchor());
      }
      camera.lookAt(anchor);
    }

    // Handle acceleration progress and effects (FOV + tiny shake)
    const persp = camera as THREE.PerspectiveCamera;
    const target = isAccelerating.current && stageIndex.current === 2 ? 1 : 0;
    const k = 3.0; // responsiveness
    accelProgress.current += (target - accelProgress.current) * Math.min(1, k * delta);
    // Audio volume/pitch
    const aud = engineAudioRef.current[activeCountry];
    if (aud) {
      const vol = 0.2 + 0.6 * accelProgress.current;
      const rate = 0.9 + 0.8 * accelProgress.current;
      aud.setVolume(vol);
      aud.setPlaybackRate(rate);
      if (accelProgress.current < 0.02 && aud.isPlaying) {
        aud.stop();
      }
    }
    if (persp instanceof THREE.PerspectiveCamera) {
      if (baseFov.current == null) baseFov.current = persp.fov;
      const fovBump = 6 * accelProgress.current;
      const newFov = Math.max(20, Math.min(120, (baseFov.current || 50) + fovBump));
      if (Math.abs(persp.fov - newFov) > 0.01) {
        persp.fov = newFov;
        persp.updateProjectionMatrix();
      }
    }
    // Tiny roll shake in interior when accelerating
    if (stageIndex.current === 2 && accelProgress.current > 0.001) {
      const shake = (Math.sin(frameTime.current * 12) * 0.5 + Math.sin(frameTime.current * 7) * 0.5) * (2 / 180) * accelProgress.current;
      camera.rotation.z += shake;
    }
  });

  return null;
};

export default CameraController;

