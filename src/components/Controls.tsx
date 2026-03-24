import React from 'react';
import { useStore, Mode, PRESET_SIZES } from '../store';
import { Dices, RotateCcw, Download, Copy, Plus, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { CollapsibleSection } from './CollapsibleSection';

const MODES: { id: Mode; label: string; defaultVariant: string; variants: string[]; params: Record<string, { min: number; max: number; step: number; default: number; label: string; description?: string; options?: string[] }> }[] = [
  {
    id: 'geometric',
    label: 'Geometric',
    defaultVariant: 'Grid',
    variants: ['Grid', 'Dots', 'Hexagons'],
    params: {
      cells: { min: 2, max: 50, step: 1, default: 10, label: 'Cell Count', description: 'Number of cells across the screen' },
      jitter: { min: 0, max: 1, step: 0.01, default: 0, label: 'Jitter', description: 'Random offset applied to each cell' },
      rotation: { min: 0, max: 360, step: 1, default: 0, label: 'Rotation', description: 'Global rotation of the pattern in degrees' },
      thickness: { min: 0.01, max: 0.5, step: 0.01, default: 0.1, label: 'Thickness', description: 'Thickness of the lines or dots' },
      roundness: { min: 0, max: 1, step: 0.01, default: 0, label: 'Roundness', description: 'Corner roundness (if applicable)' },
      noiseScale: { min: 0, max: 5, step: 0.1, default: 1, label: 'Noise Scale', description: 'Scale of the color noise applied to cells' },
    },
  },
  {
    id: 'gradient',
    label: 'Gradient',
    defaultVariant: 'Mesh',
    variants: ['Mesh', 'Aurora', 'Radial', 'Conic'],
    params: {
      complexity: { min: 1, max: 10, step: 0.1, default: 2, label: 'Complexity', description: 'Number of overlapping gradient layers' },
      distortion: { min: 0, max: 5, step: 0.1, default: 1.5, label: 'Distortion', description: 'Amount of noise warping the gradient' },
      scale: { min: 0.1, max: 5, step: 0.1, default: 1, label: 'Scale', description: 'Overall zoom level of the gradient' },
      colorShift: { min: 0, max: 5, step: 0.1, default: 0, label: 'Color Shift', description: 'Shifts the colors along the palette' },
      centerX: { min: -1, max: 2, step: 0.01, default: 0.5, label: 'Center X', description: 'Horizontal center of the gradient' },
      centerY: { min: -1, max: 2, step: 0.01, default: 0.5, label: 'Center Y', description: 'Vertical center of the gradient' },
    },
  },
  {
    id: 'abstract',
    label: 'Abstract',
    defaultVariant: 'Liquid',
    variants: ['Liquid', 'Flow Field', 'Swirl', 'Voronoi'],
    params: {
      density: { min: 1, max: 20, step: 0.1, default: 5, label: 'Density', description: 'Density of the abstract pattern' },
      curl: { min: 0, max: 10, step: 0.1, default: 2, label: 'Curl Strength', description: 'Intensity of the swirling motion' },
      speed: { min: 0, max: 10, step: 0.1, default: 1, label: 'Noise Speed', description: 'Speed of the underlying noise evolution' },
      detail: { min: 1, max: 20, step: 0.1, default: 3, label: 'Detail', description: 'Fine detail and high-frequency noise' },
      warp: { min: 0, max: 10, step: 0.1, default: 1, label: 'Warp', description: 'Amount of spatial warping' },
      contrast: { min: 0.1, max: 5, step: 0.1, default: 1.5, label: 'Contrast', description: 'Visual contrast of the pattern' },
    },
  },
  {
    id: 'noise',
    label: 'Noise',
    defaultVariant: 'FBM',
    variants: ['FBM', 'Value Noise', 'Ridged'],
    params: {
      octaves: { min: 1, max: 8, step: 1, default: 4, label: 'Octaves', description: 'Number of noise layers added together' },
      frequency: { min: 0.1, max: 20, step: 0.1, default: 5, label: 'Frequency', description: 'Base frequency of the noise' },
      amplitude: { min: 0, max: 5, step: 0.1, default: 1, label: 'Amplitude', description: 'Overall intensity of the noise' },
      lacunarity: { min: 1, max: 5, step: 0.1, default: 2, label: 'Lacunarity', description: 'Frequency multiplier between octaves' },
      gain: { min: 0, max: 2, step: 0.01, default: 0.5, label: 'Gain', description: 'Amplitude multiplier between octaves' },
      ridgeThreshold: { min: 0, max: 1, step: 0.01, default: 0.5, label: 'Ridge Threshold', description: 'Threshold for ridged noise variants' },
    },
  },
  {
    id: 'creative',
    label: 'Creative',
    defaultVariant: 'Metaballs',
    variants: ['Metaballs', 'Starfield', 'Fractal'],
    params: {
      complexity: { min: 1, max: 20, step: 1, default: 5, label: 'Complexity', description: 'Number of elements or iterations' },
      distortion: { min: 0, max: 5, step: 0.1, default: 0, label: 'Distortion', description: 'Amount of spatial distortion' },
      size: { min: 0.01, max: 0.5, step: 0.01, default: 0.1, label: 'Size', description: 'Base size of the elements' },
      spread: { min: 0.1, max: 5, step: 0.1, default: 1, label: 'Spread', description: 'How far elements are spread apart' },
      glow: { min: 0.1, max: 20, step: 0.1, default: 5, label: 'Glow', description: 'Intensity of the glowing effect' },
      iteration: { min: 1, max: 100, step: 1, default: 20, label: 'Iteration', description: 'Number of fractal iterations' },
    },
  },
  {
    id: 'waves',
    label: 'Waves',
    defaultVariant: 'Sine',
    variants: ['Sine', 'Pulse', 'Sawtooth'],
    params: {
      frequency: { min: 1, max: 50, step: 0.1, default: 10, label: 'Frequency', description: 'Number of wave cycles' },
      amplitude: { min: 0, max: 2, step: 0.01, default: 0.2, label: 'Amplitude', description: 'Height of the waves' },
      phase: { min: 0, max: 6.28, step: 0.01, default: 0, label: 'Phase', description: 'Horizontal shift of the waves' },
      complexity: { min: 1, max: 20, step: 1, default: 5, label: 'Complexity', description: 'Number of overlapping wave layers' },
      thickness: { min: 0.001, max: 0.2, step: 0.001, default: 0.02, label: 'Thickness', description: 'Thickness of the wave lines' },
      verticalShift: { min: -1, max: 1, step: 0.01, default: 0, label: 'Vertical Shift', description: 'Vertical position of the waves' },
    },
  },
  {
    id: '3d',
    label: '3D Shapes',
    defaultVariant: 'Raymarch',
    variants: ['Raymarch', 'Infinite City', 'Floating Array'],
    params: {
      lightAngle: { min: 0, max: 360, step: 1, default: 45, label: 'Light Angle', description: 'Horizontal angle of the main light' },
      lightElevation: { min: -90, max: 90, step: 1, default: 45, label: 'Light Elevation', description: 'Vertical angle of the main light' },
      ambientLight: { min: 0, max: 1, step: 0.01, default: 0.2, label: 'Ambient Light', description: 'Base light level' },
      diffuseIntensity: { min: 0, max: 2, step: 0.01, default: 0.8, label: 'Diffuse Intensity', description: 'Intensity of direct light' },
      fresnelIntensity: { min: 0, max: 2, step: 0.01, default: 0.5, label: 'Fresnel Intensity', description: 'Intensity of edge lighting' },
      fresnelPower: { min: 1, max: 10, step: 0.1, default: 5.0, label: 'Fresnel Power', description: 'Sharpness of edge lighting' },
    },
  },
];

const POPULAR_PALETTES = [
  { name: 'Midnight', colors: ['#0f3460', '#e94560', '#1a1a2e'] },
  { name: 'Sunset', colors: ['#ff7e5f', '#feb47b', '#868f96', '#596164'] },
  { name: 'Oceanic', colors: ['#0093E9', '#80D0C7', '#00DBDE', '#FC00FF'] },
  { name: 'Cyberpunk', colors: ['#FF0844', '#FFB199', '#8A2387', '#E94057', '#F27121'] },
  { name: 'Peach', colors: ['#FF9A9E', '#FECFEF', '#F6416C'] },
  { name: 'Aurora', colors: ['#00C9FF', '#92FE9D', '#1A2980', '#26D0CE'] },
  { name: 'Earth', colors: ['#606c38', '#283618', '#fefae0', '#dda15e', '#bc6c25'] },
  { name: 'Stripe', colors: ['#ff4b1f', '#ff9068', '#16BFFD', '#CB3066', '#E684AE'] },
  { name: 'Apple', colors: ['#4facfe', '#00f2fe', '#f093fb', '#f5576c'] },
  { name: 'Abstract Flowers', colors: ['#fdfbfb', '#ebedee', '#fdfbfb', '#e2d1c3'] },
  { name: 'Liquid Red', colors: ['#ff0844', '#ffb199', '#ffffff', '#ff0844'] },
  { name: 'Soft Citrus', colors: ['#f6d365', '#fda085', '#f6d365', '#ff9a9e'] },
];

export function Controls() {
  const {
    mode,
    variant,
    seed,
    brightness,
    contrast,
    vignette,
    grain,
    palette,
    modeParams,
    setMode,
    setSeed,
    setBrightness,
    setContrast,
    setVignette,
    setGrain,
    setPalette,
    setModeParam,
    setPresetSizeId,
    presetSizeId,
    customWidth,
    customHeight,
    setCustomWidth,
    setCustomHeight,
    randomize,
    reset,
    edgeSoftness,
    setEdgeSoftness,
    objects3d,
    addObject3d,
    updateObject3d,
    removeObject3d,
  } = useStore();

  const currentModeConfig = MODES.find((m) => m.id === mode);
  const setVariant = useStore(state => state.setVariant);

  const handleExport = async () => {
    const state = useStore.getState();
    const w = state.presetSizeId === 'custom' ? state.customWidth : (PRESET_SIZES.find(p => p.id === state.presetSizeId)?.width || 1920);
    const h = state.presetSizeId === 'custom' ? state.customHeight : (PRESET_SIZES.find(p => p.id === state.presetSizeId)?.height || 1080);
    window.dispatchEvent(new CustomEvent('export-high-res', { detail: { width: w, height: h, type: 'download' } }));
  };

  const handleCopy = async () => {
    const state = useStore.getState();
    const w = state.presetSizeId === 'custom' ? state.customWidth : (PRESET_SIZES.find(p => p.id === state.presetSizeId)?.width || 1920);
    const h = state.presetSizeId === 'custom' ? state.customHeight : (PRESET_SIZES.find(p => p.id === state.presetSizeId)?.height || 1080);
    window.dispatchEvent(new CustomEvent('export-high-res', { detail: { width: w, height: h, type: 'copy' } }));
  };

  const updateColor = (index: number, color: string) => {
    const newPalette = [...palette];
    newPalette[index] = color;
    setPalette(newPalette);
  };

  const addColor = () => {
    if (palette.length < 6) {
      setPalette([...palette, '#ffffff']);
    }
  };

  const removeColor = (index: number) => {
    if (palette.length > 2) {
      const newPalette = [...palette];
      newPalette.splice(index, 1);
      setPalette(newPalette);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800 overflow-hidden w-full max-w-md">
      {/* Sticky Top: Mode Selector */}
      <div className="shrink-0 p-4 border-b border-zinc-800 bg-zinc-950">
        <div className="flex flex-wrap gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                const defaultParams = Object.keys(m.params).reduce((acc, key) => {
                  acc[key] = m.params[key].default;
                  return acc;
                }, {} as Record<string, number>);
                setMode(m.id, m.defaultVariant, defaultParams);
              }}
              className={cn(
                "px-2.5 py-1 text-xs rounded-full transition-colors border",
                mode === m.id
                  ? "bg-zinc-100 text-zinc-900 border-zinc-100 font-medium"
                  : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Pattern Section */}
        <CollapsibleSection title="Pattern" defaultOpen>
          <div className="space-y-5">
            {/* Variant */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Variant</label>
              <div className="flex flex-wrap gap-1.5">
                {currentModeConfig?.variants.map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      const defaultParams = Object.keys(currentModeConfig.params).reduce((acc, key) => {
                        acc[key] = currentModeConfig.params[key].default;
                        return acc;
                      }, {} as Record<string, number>);
                      setVariant(v, defaultParams);
                    }}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-md transition-colors border",
                      variant === v
                        ? "bg-zinc-800 text-zinc-100 border-zinc-700 font-medium"
                        : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Seed */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs uppercase tracking-widest text-zinc-500">Seed</label>
                <button
                  onClick={() => setSeed(Math.floor(Math.random() * 999999))}
                  className="text-xs flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <Dices className="w-3 h-3" /> Randomize
                </button>
              </div>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm font-mono text-zinc-300 focus:outline-none focus:border-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Mode-Specific Parameters */}
            {currentModeConfig && Object.keys(currentModeConfig.params).length > 0 && (
              <div className="space-y-4 pt-2">
                <label className="block text-xs uppercase tracking-widest text-zinc-500">
                  {mode === '3d' ? 'Scene Lighting' : 'Parameters'}
                </label>
                {Object.entries(currentModeConfig.params).map(([key, config]) => {
                  const val = modeParams[key] ?? config.default;
                  return (
                    <div key={key}>
                      <div className="flex justify-between mb-1.5">
                        <label className="text-sm text-zinc-300 cursor-help" title={config.description}>{config.label}</label>
                        {!config.options && (
                          <span className="text-xs font-mono text-zinc-500">
                            {config.step >= 1 ? val.toFixed(0) : val.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {config.options ? (
                        <select
                          value={val}
                          onChange={(e) => setModeParam(key, parseFloat(e.target.value))}
                          className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                        >
                          {config.options.map((opt, i) => (
                            <option key={i} value={i}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="range"
                          min={config.min}
                          max={config.max}
                          step={config.step}
                          value={val}
                          onChange={(e) => setModeParam(key, parseFloat(e.target.value))}
                          className="w-full accent-zinc-400"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3D Objects (conditional) */}
            {mode === '3d' && (
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs uppercase tracking-widest text-zinc-500">3D Objects</label>
                  <button
                    onClick={() => addObject3d({ id: Date.now().toString(), shape: 0, x: objects3d.length * 0.5, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0, param1: 1, param2: 1, param3: 1 })}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded transition-colors"
                  >
                    Add Object
                  </button>
                </div>
                <div className="space-y-3">
                  {objects3d.map((obj, index) => (
                    <Object3DControls
                      key={obj.id}
                      obj={obj}
                      index={index}
                      updateObject3d={updateObject3d}
                      removeObject3d={removeObject3d}
                    />
                  ))}
                  {objects3d.length === 0 && (
                    <div className="text-xs text-zinc-500 text-center py-4 border border-dashed border-zinc-800 rounded-md">
                      No 3D objects added.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Color Section */}
        <CollapsibleSection title="Color" defaultOpen>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs uppercase tracking-widest text-zinc-500">Palette <span className="text-zinc-600 ml-1">({palette.length}/6)</span></label>
              <button
                onClick={() => {
                  const newPalette = palette.map(() => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'));
                  setPalette(newPalette);
                }}
                className="text-xs flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <Dices className="w-3 h-3" /> Randomize
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {palette.map((color, i) => (
                <div key={i} className="relative group">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => updateColor(i, e.target.value)}
                    className="w-10 h-10 rounded-full cursor-pointer border-0 p-0 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full ring-2 ring-zinc-800 hover:ring-zinc-600 transition-all shadow-sm"
                  />
                  {palette.length > 2 && (
                    <button
                      onClick={() => removeColor(i)}
                      className="absolute -top-2 -right-2 bg-zinc-800 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700 shadow-md"
                    >
                      <X className="w-3 h-3 text-zinc-300" />
                    </button>
                  )}
                </div>
              ))}
              {palette.length < 6 && (
                <button
                  onClick={addColor}
                  className="w-10 h-10 rounded-full border-2 border-dashed border-zinc-700 flex items-center justify-center hover:border-zinc-500 hover:text-zinc-200 transition-colors bg-zinc-900/50"
                >
                  <Plus className="w-4 h-4 text-zinc-500" />
                </button>
              )}
            </div>
            {/* Weight indicator bar */}
            <div className="h-1.5 w-full rounded-full overflow-hidden flex">
              {palette.map((color, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: color,
                    flex: i === 0 ? 3 : i === 1 ? 2 : 1
                  }}
                />
              ))}
            </div>
            {/* Popular Palettes */}
            <div className="pt-2">
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-3">Popular Combinations</label>
              <div className="grid grid-cols-2 gap-2">
                {POPULAR_PALETTES.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => setPalette(p.colors)}
                    className="flex flex-col gap-1.5 p-2 rounded-md border border-zinc-800 hover:border-zinc-600 bg-zinc-900/50 hover:bg-zinc-800 transition-all text-left group"
                  >
                    <div className="flex w-full h-3 rounded-sm overflow-hidden">
                      {p.colors.map((c, i) => (
                        <div key={i} style={{ backgroundColor: c }} className="flex-1 h-full" />
                      ))}
                    </div>
                    <span className="text-[10px] text-zinc-400 group-hover:text-zinc-200 truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Effects Section */}
        <CollapsibleSection title="Effects" defaultOpen={false}>
          <div className="space-y-4">
            {/* Edge Softness */}
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-sm text-zinc-300 cursor-help" title="Controls the sharpness or diffusion of edges">Edge Softness</label>
                <span className="text-xs font-mono text-zinc-500">{edgeSoftness.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={edgeSoftness}
                onChange={(e) => setEdgeSoftness(parseFloat(e.target.value))}
                className="w-full accent-zinc-400"
              />
            </div>
            {[
              { label: 'Brightness', value: brightness, setter: setBrightness, min: -1, max: 1 },
              { label: 'Contrast', value: contrast, setter: setContrast, min: 0.5, max: 2 },
              { label: 'Vignette', value: vignette, setter: setVignette, max: 1 },
              { label: 'Grain', value: grain, setter: setGrain, max: 0.5 },
            ].map((param) => (
              <div key={param.label}>
                <div className="flex justify-between mb-1.5">
                  <label className="text-sm text-zinc-300">{param.label}</label>
                  <span className="text-xs font-mono text-zinc-500">{param.value.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={param.min || 0}
                  max={param.max}
                  step="0.01"
                  value={param.value}
                  onChange={(e) => param.setter(parseFloat(e.target.value))}
                  className="w-full accent-zinc-400"
                />
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Export Section */}
        <CollapsibleSection title="Export" defaultOpen={false}>
          <div className="space-y-4">
            <select
              value={presetSizeId}
              onChange={(e) => setPresetSizeId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-600"
            >
              <option value="custom">Custom Size</option>
              {Array.from(new Set(PRESET_SIZES.map(p => p.category))).map(category => (
                <optgroup key={category} label={category}>
                  {PRESET_SIZES.filter(p => p.category === category).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.width} × {p.height})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {presetSizeId === 'custom' && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">Width</label>
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm font-mono text-zinc-300 focus:outline-none focus:border-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">Height</label>
                  <input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm font-mono text-zinc-300 focus:outline-none focus:border-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>

      {/* Sticky Bottom: Action Buttons */}
      <div className="shrink-0 p-4 border-t border-zinc-800 bg-zinc-950 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (currentModeConfig) {
                const newParams = { ...modeParams };
                Object.keys(newParams).forEach(key => {
                  const config = currentModeConfig.params[key];
                  const range = config.max - config.min;
                  const randomVal = config.min + Math.random() * range;
                  const steps = Math.round((randomVal - config.min) / config.step);
                  newParams[key] = config.min + steps * config.step;
                });
                randomize(newParams);
              } else {
                randomize();
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-900 border border-zinc-800 rounded-md hover:bg-zinc-800 transition-colors text-sm font-medium"
          >
            <Dices className="w-4 h-4" /> Randomize
          </button>
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-900 border border-zinc-800 rounded-md hover:bg-zinc-800 transition-colors text-sm font-medium"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-md transition-colors text-sm font-medium"
          >
            <Copy className="w-4 h-4" /> Copy PNG
          </button>
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-100 hover:bg-white text-zinc-900 rounded-md transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" /> Export PNG
          </button>
        </div>
      </div>
    </div>
  );
}

// Extracted 3D Object controls to reduce the main component complexity
function Object3DControls({
  obj,
  index,
  updateObject3d,
  removeObject3d,
}: {
  obj: import('../store').Object3D;
  index: number;
  updateObject3d: (id: string, updates: Partial<import('../store').Object3D>) => void;
  removeObject3d: (id: string) => void;
}) {
  return (
    <div className="bg-zinc-900/50 p-3 rounded-md border border-zinc-800 relative group">
      <button
        onClick={() => removeObject3d(obj.id)}
        className="absolute top-2 right-2 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="text-xs font-medium text-zinc-400 mb-2">Object {index + 1}</div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] uppercase text-zinc-500 mb-1 block">Shape</label>
          <select
            value={obj.shape}
            onChange={(e) => updateObject3d(obj.id, { shape: parseFloat(e.target.value) })}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-600"
          >
            <option value={0}>Sphere</option>
            <option value={1}>Box</option>
            <option value={2}>Torus</option>
            <option value={3}>Cylinder</option>
            <option value={4}>Octahedron</option>
            <option value={5}>Capsule</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-3 mb-3">
          {([
            ['x', 'Pos X', obj.x, -5, 5, 0.1, (v: number) => ({ x: v })],
            ['rotX', 'Rot X', obj.rotX, 0, 360, 1, (v: number) => ({ rotX: v })],
            ['y', 'Pos Y', obj.y, -5, 5, 0.1, (v: number) => ({ y: v })],
            ['rotY', 'Rot Y', obj.rotY, 0, 360, 1, (v: number) => ({ rotY: v })],
            ['z', 'Pos Z', obj.z, -5, 5, 0.1, (v: number) => ({ z: v })],
            ['rotZ', 'Rot Z', obj.rotZ, 0, 360, 1, (v: number) => ({ rotZ: v })],
          ] as const).map(([key, label, value, min, max, step, update]) => (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <label className="text-[10px] uppercase text-zinc-500 block">{label}</label>
                <span className="text-[10px] font-mono text-zinc-500">
                  {key.startsWith('rot') ? `${(value as number).toFixed(0)}°` : (value as number).toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => updateObject3d(obj.id, (update as (v: number) => Partial<import('../store').Object3D>)(parseFloat(e.target.value)))}
                className="w-full accent-zinc-400"
              />
            </div>
          ))}
        </div>

        {/* Shape-specific params */}
        {obj.shape === 0 && (
          <RangeParam label="Radius" value={obj.param1} min={0.1} max={3} step={0.05} onChange={(v) => updateObject3d(obj.id, { param1: v })} />
        )}
        {obj.shape === 1 && (
          <>
            <RangeParam label="Width" value={obj.param1} min={0.1} max={3} step={0.05} onChange={(v) => updateObject3d(obj.id, { param1: v })} />
            <RangeParam label="Height" value={obj.param2} min={0.1} max={3} step={0.05} onChange={(v) => updateObject3d(obj.id, { param2: v })} />
            <RangeParam label="Depth" value={obj.param3} min={0.1} max={3} step={0.05} onChange={(v) => updateObject3d(obj.id, { param3: v })} />
          </>
        )}
        {obj.shape === 2 && (
          <>
            <RangeParam label="Major Radius" value={obj.param1} min={0.1} max={3} step={0.05} onChange={(v) => updateObject3d(obj.id, { param1: v })} />
            <RangeParam label="Minor Radius" value={obj.param2} min={0.05} max={1.5} step={0.05} onChange={(v) => updateObject3d(obj.id, { param2: v })} />
          </>
        )}
        {(obj.shape === 3 || obj.shape === 5) && (
          <>
            <RangeParam label="Radius" value={obj.param1} min={0.1} max={3} step={0.05} onChange={(v) => updateObject3d(obj.id, { param1: v })} />
            <RangeParam label="Height" value={obj.param2} min={0.1} max={3} step={0.05} onChange={(v) => updateObject3d(obj.id, { param2: v })} />
          </>
        )}
        {obj.shape === 4 && (
          <RangeParam label="Size" value={obj.param1} min={0.1} max={3} step={0.05} onChange={(v) => updateObject3d(obj.id, { param1: v })} />
        )}
      </div>
    </div>
  );
}

function RangeParam({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-[10px] uppercase text-zinc-500 block">{label}</label>
        <span className="text-[10px] font-mono text-zinc-500">{value.toFixed(2)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-zinc-400" />
    </div>
  );
}
