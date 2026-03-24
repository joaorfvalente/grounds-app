import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Mode = 'geometric' | 'gradient' | 'abstract' | 'noise' | 'creative' | 'waves' | '3d';

export interface PresetSize {
  id: string;
  label: string;
  width: number;
  height: number;
  category: 'Digital' | 'Print' | 'Social';
}

export const PRESET_SIZES: PresetSize[] = [
  { id: 'figma', label: 'Figma Cover (2:1)', width: 1920, height: 960, category: 'Digital' },
  { id: '1080p', label: '1080p HD (16:9)', width: 1920, height: 1080, category: 'Digital' },
  { id: '4k', label: '4K UHD (16:9)', width: 3840, height: 2160, category: 'Digital' },
  { id: 'dribbble', label: 'Dribbble Shot (4:3)', width: 1600, height: 1200, category: 'Social' },
  { id: 'square', label: 'Instagram Square (1:1)', width: 1080, height: 1080, category: 'Social' },
  { id: 'portrait', label: 'Story / Reel (9:16)', width: 1080, height: 1920, category: 'Social' },
  { id: 'a4', label: 'A4 Print (300dpi)', width: 2480, height: 3508, category: 'Print' },
  { id: 'letter', label: 'US Letter (300dpi)', width: 2550, height: 3300, category: 'Print' },
];

export interface Object3D {
  id: string;
  shape: number;
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  param1: number;
  param2: number;
  param3: number;
}

export interface EditorState {
  mode: Mode;
  variant: string;
  seed: number;
  brightness: number;
  contrast: number;
  vignette: number;
  grain: number;
  edgeSoftness: number;
  palette: string[];
  modeParams: Record<string, number>;
  objects3d: Object3D[];
}

export interface AppState extends EditorState {
  presetSizeId: string;
  customWidth: number;
  customHeight: number;
  activeObject3dId: string | null;
  activePresetId: string | null;

  // Actions
  setMode: (mode: Mode, defaultVariant: string, defaultParams: Record<string, number>) => void;
  setVariant: (variant: string, defaultParams: Record<string, number>) => void;
  setSeed: (seed: number) => void;
  setBrightness: (brightness: number) => void;
  setContrast: (contrast: number) => void;
  setVignette: (vignette: number) => void;
  setGrain: (grain: number) => void;
  setEdgeSoftness: (softness: number) => void;
  setPalette: (palette: string[]) => void;
  setModeParam: (key: string, value: number) => void;
  setPresetSizeId: (id: string) => void;
  setCustomWidth: (width: number) => void;
  setCustomHeight: (height: number) => void;
  addObject3d: (obj: Object3D) => void;
  updateObject3d: (id: string, updates: Partial<Object3D>) => void;
  removeObject3d: (id: string) => void;
  setActiveObject3dId: (id: string | null) => void;
  setActivePresetId: (id: string | null) => void;
  loadFromPreset: (state: EditorState) => void;
  getEditorState: () => EditorState;
  randomize: (boundedParams?: Record<string, number>) => void;
  reset: () => void;
}

const DEFAULT_PALETTE = ['#0f3460', '#e94560', '#1a1a2e'];

const initialEditorState: EditorState = {
  mode: 'gradient',
  variant: 'Mesh',
  seed: 48291,
  brightness: 0.0,
  contrast: 1.0,
  vignette: 0.3,
  grain: 0.08,
  edgeSoftness: 0.0,
  palette: DEFAULT_PALETTE,
  modeParams: {
    complexity: 2,
    distortion: 1.5,
    scale: 1,
    colorShift: 0,
    centerX: 0.5,
    centerY: 0.5,
  },
  objects3d: [
    { id: '1', shape: 0, x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0, param1: 1, param2: 1, param3: 1 }
  ],
};

const initialState = {
  ...initialEditorState,
  presetSizeId: 'figma',
  customWidth: 1920,
  customHeight: 1080,
  activeObject3dId: null as string | null,
  activePresetId: null as string | null,
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setMode: (mode, defaultVariant, defaultParams) => set({ mode, variant: defaultVariant, modeParams: defaultParams }),
      setVariant: (variant, defaultParams) => set({ variant, modeParams: defaultParams }),
      setSeed: (seed) => set({ seed }),
      setBrightness: (brightness) => set({ brightness }),
      setContrast: (contrast) => set({ contrast }),
      setVignette: (vignette) => set({ vignette }),
      setGrain: (grain) => set({ grain }),
      setEdgeSoftness: (edgeSoftness) => set({ edgeSoftness }),
      setPalette: (palette) => set({ palette }),
      setModeParam: (key, value) => set((state) => ({ modeParams: { ...state.modeParams, [key]: value } })),
      setPresetSizeId: (id) => set({ presetSizeId: id }),
      setCustomWidth: (width) => set({ customWidth: width }),
      setCustomHeight: (height) => set({ customHeight: height }),
      addObject3d: (obj) => set((state) => ({ objects3d: [...state.objects3d, obj] })),
      updateObject3d: (id, updates) => set((state) => ({
        objects3d: state.objects3d.map(obj => obj.id === id ? { ...obj, ...updates } : obj)
      })),
      removeObject3d: (id) => set((state) => ({
        objects3d: state.objects3d.filter(obj => obj.id !== id),
        activeObject3dId: state.activeObject3dId === id ? null : state.activeObject3dId
      })),
      setActiveObject3dId: (id) => set({ activeObject3dId: id }),
      setActivePresetId: (id) => set({ activePresetId: id }),

      loadFromPreset: (presetState: EditorState) => set({
        mode: presetState.mode,
        variant: presetState.variant,
        seed: presetState.seed,
        brightness: presetState.brightness,
        contrast: presetState.contrast,
        vignette: presetState.vignette,
        grain: presetState.grain,
        edgeSoftness: presetState.edgeSoftness,
        palette: presetState.palette,
        modeParams: presetState.modeParams,
        objects3d: presetState.objects3d,
      }),

      getEditorState: () => {
        const state = get();
        return {
          mode: state.mode,
          variant: state.variant,
          seed: state.seed,
          brightness: state.brightness,
          contrast: state.contrast,
          vignette: state.vignette,
          grain: state.grain,
          edgeSoftness: state.edgeSoftness,
          palette: [...state.palette],
          modeParams: { ...state.modeParams },
          objects3d: state.objects3d.map(obj => ({ ...obj })),
        };
      },

      randomize: (boundedParams?: Record<string, number>) => {
        const state = get();
        if (boundedParams) {
          set({
            seed: Math.floor(Math.random() * 999999),
            modeParams: boundedParams
          });
          return;
        }
        const newParams = { ...state.modeParams };
        Object.keys(newParams).forEach(key => {
          newParams[key] = Math.random();
        });
        set({
          seed: Math.floor(Math.random() * 999999),
          modeParams: newParams
        });
      },

      reset: () => set({
        ...initialEditorState,
        presetSizeId: initialState.presetSizeId,
        customWidth: initialState.customWidth,
        customHeight: initialState.customHeight,
        activeObject3dId: null,
        activePresetId: null,
      }),
    }),
    {
      name: 'grounds-editor-draft',
      partialize: (state) => ({
        mode: state.mode,
        variant: state.variant,
        seed: state.seed,
        brightness: state.brightness,
        contrast: state.contrast,
        vignette: state.vignette,
        grain: state.grain,
        edgeSoftness: state.edgeSoftness,
        palette: state.palette,
        modeParams: state.modeParams,
        objects3d: state.objects3d,
        presetSizeId: state.presetSizeId,
        customWidth: state.customWidth,
        customHeight: state.customHeight,
        activePresetId: state.activePresetId,
      }),
    }
  )
);
