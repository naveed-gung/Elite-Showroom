import { create } from 'zustand';

export interface CarPartData {
  hp: number;
  year: number;
  count: number;
  price: number;
}

export interface CarPart {
  name: string;
  nodeName: string;
  data: CarPartData;
  cameraOffset: { x: number; y: number; z: number };
  fov: number;
}

export interface CarSpec {
  glb: string;
  parts: CarPart[];
}

export interface Shot {
  partNode: string;
  cameraOffset: { x: number; y: number; z: number };
  fov: number;
  durationMs: number;
}

interface ShowroomState {
  // Core state
  activeCountry: string;
  cars: Record<string, CarSpec>;
  carMeta: Record<string, { name: string }>;
  currentShotIndex: number;
  shots: Shot[];
  lightBootDone: boolean;
  cameraStage: number; // 0: Front, 1: Side, 2: Interior, 3: Rear
  brightness: number; // 0..1 multiplier for showroom brightness
  
  // Mobile state
  isMobileSidebarOpen: boolean;
  visibleCountries: Record<string, boolean>;
  
  // Actions
  setActiveCountry: (country: string) => void;
  setCurrentShotIndex: (index: number) => void;
  setLightBootDone: (done: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleCountryVisible: (country: string) => void;
  setCameraStage: (stage: number) => void;
  setBrightness: (b: number) => void;
  
  // Computed
  currentCar: () => CarSpec | null;
  currentPart: () => CarPart | null;
}

// Initial car data - only Germany, USA, Japan
const initialCars: Record<string, CarSpec> = {
  Germany: {
    glb: '/modules/showroom.glb',
    parts: [
      {
        name: 'Engine',
        nodeName: 'GermanCar_Engine',
        data: { hp: 560, year: 2023, count: 5, price: 180000 },
        cameraOffset: { x: -8, y: -6, z: 0.5 },
        fov: 35,
      },
    ],
  },
  USA: {
    glb: '/modules/showroom.glb',
    parts: [
      {
        name: 'Engine',
        nodeName: 'USACar_Engine',
        data: { hp: 650, year: 2024, count: 3, price: 120000 },
        cameraOffset: { x: 0, y: -6, z: 0.5 },
        fov: 35,
      },
    ],
  },
  Japan: {
    glb: '/modules/showroom.glb',
    parts: [
      {
        name: 'Engine',
        nodeName: 'JapanCar_Engine',
        data: { hp: 485, year: 2022, count: 8, price: 95000 },
        cameraOffset: { x: 8, y: -6, z: 0.5 },
        fov: 35,
      },
    ],
  },
};

export const useShowroom = create<ShowroomState>((set, get) => ({
  activeCountry: '',
  cars: initialCars,
  carMeta: {
    Germany: { name: 'Porsche 911 Carrera GTS' },
    USA: { name: 'Chevrolet Corvette' },
    Japan: { name: 'Honda Civic Type R (FK8)' },
  },
  currentShotIndex: 0,
  shots: [],
  lightBootDone: false,
  cameraStage: 0,
  brightness: 1.0,
  isMobileSidebarOpen: false,
  visibleCountries: { Germany: true, USA: true, Japan: true },

  setActiveCountry: (country: string) => {
    set((state) => {
      const car = state.cars[country];
      const newShots: Shot[] = car?.parts.map((part) => ({
        partNode: part.nodeName,
        cameraOffset: part.cameraOffset,
        fov: part.fov,
        durationMs: 1000,
      })) || [];

      return {
        activeCountry: country,
        currentShotIndex: 0,
        shots: newShots,
      };
    });
  },

  setCurrentShotIndex: (index: number) => {
    set((state) => ({
      currentShotIndex: Math.max(0, Math.min(index, state.shots.length - 1)),
    }));
  },

  setLightBootDone: (done: boolean) => set({ lightBootDone: done }),
  setCameraStage: (stage: number) => set({ cameraStage: stage }),
  setBrightness: (b: number) => set({ brightness: Math.max(0, Math.min(1, b)) }),
  
  setMobileSidebarOpen: (open: boolean) => set({ isMobileSidebarOpen: open }),

  toggleCountryVisible: (country: string) =>
    set((state) => ({
      visibleCountries: {
        ...state.visibleCountries,
        [country]: !state.visibleCountries[country],
      },
    })),

  currentCar: () => {
    const state = get();
    return state.cars[state.activeCountry] || null;
  },

  currentPart: () => {
    const state = get();
    const car = state.currentCar();
    return car?.parts[state.currentShotIndex] || null;
  },
}));