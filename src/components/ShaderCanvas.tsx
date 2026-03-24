import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from '../store';
import { vertexShaderSource, shaders } from '../shaders';

export function ShaderCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);

  const {
    mode,
    variant,
    seed,
    brightness,
    contrast,
    vignette,
    grain,
    edgeSoftness,
    palette,
    modeParams,
    objects3d,
    updateObject3d,
    activeObject3dId,
    setActiveObject3dId
  } = useStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'rotation' | 'position'>('rotation');
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  const getUv = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const uvX = (x - 0.5 * rect.width) / rect.height;
    const uvY = (0.5 * rect.height - y) / rect.height;
    return { uvX, uvY };
  };

  const worldToCamera = (x: number, y: number, z: number) => {
    const b = -45 * Math.PI / 180;
    const cb = Math.cos(b), sb = Math.sin(b);
    const x1 = x * cb - z * sb;
    const z1 = x * sb + z * cb;
    const y1 = y;
    
    const a = -35.264 * Math.PI / 180;
    const ca = Math.cos(a), sa = Math.sin(a);
    const y2 = y1 * ca - z1 * sa;
    const z2 = y1 * sa + z1 * ca;
    
    return { x: x1, y: y2, z: z2 };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== '3d') return;
    const { uvX, uvY } = getUv(e);
    
    let closestId: string | null = null;
    let minDist = Infinity;
    
    objects3d.forEach(obj => {
      const camPos = worldToCamera(obj.x, obj.y, obj.z);
      const depth = camPos.z + 3.0;
      if (depth <= 0) return;
      
      const expectedUvX = camPos.x / depth;
      const expectedUvY = camPos.y / depth;
      
      const dist = Math.sqrt((expectedUvX - uvX)**2 + (expectedUvY - uvY)**2);
      const hitRadius = Math.max(0.1, (obj.param1 / depth) * 1.5); 
      
      if (dist < hitRadius && dist < minDist) {
        minDist = dist;
        closestId = obj.id;
      }
    });

    if (closestId) {
      setActiveObject3dId(closestId);
      setIsDragging(true);
      setDragMode(e.button === 2 ? 'rotation' : 'position');
      setLastPos({ x: uvX, y: uvY });
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      setActiveObject3dId(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !activeObject3dId || mode !== '3d') return;
    
    const { uvX, uvY } = getUv(e);
    const dx = uvX - lastPos.x;
    const dy = uvY - lastPos.y;
    
    const obj = objects3d.find(o => o.id === activeObject3dId);
    if (obj) {
      if (dragMode === 'position') {
        const camPos = worldToCamera(obj.x, obj.y, obj.z);
        const depth = camPos.z + 3.0;
        
        const deltaCamX = dx * depth;
        const deltaCamY = dy * depth;
        
        const a = 35.264 * Math.PI / 180;
        const b = 45.0 * Math.PI / 180;
        const cosA = Math.cos(a), sinA = Math.sin(a);
        const cosB = Math.cos(b), sinB = Math.sin(b);
        
        const deltaWorldX = deltaCamX * cosB - deltaCamY * sinA * sinB;
        const deltaWorldY = deltaCamY * cosA;
        const deltaWorldZ = deltaCamX * sinB + deltaCamY * sinA * cosB;
        
        updateObject3d(obj.id, { 
          x: obj.x + deltaWorldX, 
          y: obj.y + deltaWorldY,
          z: obj.z + deltaWorldZ
        });
      } else {
        // Rotation mode
        const deltaRotY = dx * 200;
        const deltaRotX = dy * 200;
        
        updateObject3d(obj.id, { 
          rotY: (obj.rotY + deltaRotY) % 360, 
          rotX: (obj.rotX + deltaRotX) % 360
        });
      }
    }
    
    setLastPos({ x: uvX, y: uvY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Initialize WebGL and compile shaders
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    glRef.current = gl;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, shaders[mode] || shaders.gradient);

    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    programRef.current = program;

    // Setup full screen quad
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    return () => {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, [mode]); // Recompile when mode changes

  const render = useCallback((overrideWidth?: number, overrideHeight?: number) => {
    const gl = glRef.current;
    const program = programRef.current;
    if (!gl || !program) return;

    gl.useProgram(program);

    // Set uniforms
    const setUniform1f = (name: string, value: number) => {
      const loc = gl.getUniformLocation(program, name);
      if (loc) gl.uniform1f(loc, value);
    };

    const setUniform1i = (name: string, value: number) => {
      const loc = gl.getUniformLocation(program, name);
      if (loc) gl.uniform1i(loc, value);
    };

    const setUniform2f = (name: string, x: number, y: number) => {
      const loc = gl.getUniformLocation(program, name);
      if (loc) gl.uniform2f(loc, x, y);
    };

    // Resize canvas to match display size with device pixel ratio, or use override
    const canvas = gl.canvas as HTMLCanvasElement;
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = overrideWidth || Math.floor(canvas.clientWidth * dpr);
    const displayHeight = overrideHeight || Math.floor(canvas.clientHeight * dpr);
    
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }

    setUniform2f('u_resolution', gl.canvas.width, gl.canvas.height);
    setUniform1f('u_seed', seed);
    setUniform1f('u_brightness', brightness);
    setUniform1f('u_contrast', contrast);
    setUniform1f('u_vignette', vignette);
    setUniform1f('u_grain', grain);
    setUniform1f('u_edgeSoftness', edgeSoftness);

    if (mode === '3d') {
      const objCount = Math.min(objects3d.length, 10);
      const locCount = gl.getUniformLocation(program, 'u_objCount');
      if (locCount) gl.uniform1i(locCount, objCount);
      
      const objTypes = new Float32Array(10);
      const objPos = new Float32Array(30);
      const objRot = new Float32Array(30);
      const objParam1 = new Float32Array(10);
      const objParam2 = new Float32Array(10);
      const objParam3 = new Float32Array(10);
      
      for (let i = 0; i < objCount; i++) {
        const obj = objects3d[i];
        objTypes[i] = obj.shape;
        objPos[i * 3] = obj.x;
        objPos[i * 3 + 1] = obj.y;
        objPos[i * 3 + 2] = obj.z;
        objRot[i * 3] = obj.rotX;
        objRot[i * 3 + 1] = obj.rotY;
        objRot[i * 3 + 2] = obj.rotZ;
        objParam1[i] = obj.param1;
        objParam2[i] = obj.param2;
        objParam3[i] = obj.param3;
      }
      
      const locTypes = gl.getUniformLocation(program, 'u_objType');
      if (locTypes) gl.uniform1fv(locTypes, objTypes);
      
      const locPos = gl.getUniformLocation(program, 'u_objPos');
      if (locPos) gl.uniform3fv(locPos, objPos);
      
      const locRot = gl.getUniformLocation(program, 'u_objRot');
      if (locRot) gl.uniform3fv(locRot, objRot);
      
      const locP1 = gl.getUniformLocation(program, 'u_objParam1');
      if (locP1) gl.uniform1fv(locP1, objParam1);
      
      const locP2 = gl.getUniformLocation(program, 'u_objParam2');
      if (locP2) gl.uniform1fv(locP2, objParam2);
      
      const locP3 = gl.getUniformLocation(program, 'u_objParam3');
      if (locP3) gl.uniform1fv(locP3, objParam3);
    }

    // Mode specific params (map up to 8 params)
    // We need to ensure the order matches the MODES config
    const currentModeConfig = [
      { id: 'geometric', keys: ['cells', 'jitter', 'rotation', 'thickness', 'roundness', 'noiseScale'] },
      { id: 'gradient', keys: ['complexity', 'distortion', 'scale', 'colorShift', 'centerX', 'centerY'] },
      { id: 'abstract', keys: ['density', 'curl', 'speed', 'detail', 'warp', 'contrast'] },
      { id: 'noise', keys: ['octaves', 'frequency', 'amplitude', 'lacunarity', 'gain', 'ridgeThreshold'] },
      { id: 'creative', keys: ['complexity', 'distortion', 'size', 'spread', 'glow', 'iteration'] },
      { id: 'waves', keys: ['frequency', 'amplitude', 'phase', 'complexity', 'thickness', 'verticalShift'] },
      { id: '3d', keys: ['lightAngle', 'lightElevation', 'ambientLight', 'diffuseIntensity', 'fresnelIntensity', 'fresnelPower'] }
    ].find(m => m.id === mode);

    const paramKeys = currentModeConfig ? currentModeConfig.keys : Object.keys(modeParams);
    
    setUniform1f('u_param1', modeParams[paramKeys[0]] ?? 0.5);
    setUniform1f('u_param2', modeParams[paramKeys[1]] ?? 0.5);
    setUniform1f('u_param3', modeParams[paramKeys[2]] ?? 0.5);
    setUniform1f('u_param4', modeParams[paramKeys[3]] ?? 0.5);
    setUniform1f('u_param5', modeParams[paramKeys[4]] ?? 0.5);
    setUniform1f('u_param6', modeParams[paramKeys[5]] ?? 0.5);
    setUniform1f('u_param7', modeParams[paramKeys[6]] ?? 0.5);
    setUniform1f('u_param8', modeParams[paramKeys[7]] ?? 0.5);

    let variantIndex = 0;
    if (mode === 'geometric') variantIndex = ['Grid', 'Dots', 'Hexagons'].indexOf(variant);
    else if (mode === 'gradient') variantIndex = ['Aurora', 'Radial', 'Conic'].indexOf(variant);
    else if (mode === 'abstract') variantIndex = ['Flow Field', 'Swirl', 'Voronoi'].indexOf(variant);
    else if (mode === 'noise') variantIndex = ['FBM', 'Value Noise', 'Ridged'].indexOf(variant);
    else if (mode === 'creative') variantIndex = ['Metaballs', 'Starfield', 'Fractal'].indexOf(variant);
    else if (mode === 'waves') variantIndex = ['Sine', 'Pulse', 'Sawtooth'].indexOf(variant);
    else if (mode === '3d') variantIndex = ['Raymarch', 'Infinite City', 'Floating Array'].indexOf(variant);
    
    setUniform1f('u_variant', Math.max(0, variantIndex));

    // Colors
    const colorLoc = gl.getUniformLocation(program, 'u_colors');
    if (colorLoc) {
      const colorData = new Float32Array(6 * 3); // 6 colors max, 3 components each
      palette.forEach((hex, i) => {
        if (i >= 6) return;
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        colorData[i * 3] = r;
        colorData[i * 3 + 1] = g;
        colorData[i * 3 + 2] = b;
      });
      gl.uniform3fv(colorLoc, colorData);
    }
    setUniform1i('u_colorCount', Math.min(palette.length, 6));

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }, [mode, variant, seed, brightness, contrast, vignette, grain, edgeSoftness, palette, modeParams, objects3d]);

  // Render when dependencies change
  useEffect(() => {
    render();
  }, [render]);

  // Render on resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      render();
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [render]);

  // Handle high-res export
  useEffect(() => {
    const handleExport = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { width, height, type } = customEvent.detail;
      const gl = glRef.current;
      if (!gl) return;
      
      // Render at high res
      render(width, height);
      
      const canvas = gl.canvas as HTMLCanvasElement;
      
      if (type === 'download') {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `background-${mode}-${seed}.png`;
        link.href = dataUrl;
        link.click();
        render(); // Restore immediately
      } else if (type === 'copy') {
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
              alert('Copied to clipboard!');
            } catch (err) {
              console.error('Failed to copy', err);
            }
          }
          render(); // Restore after blob is created
        });
      } else if (type === 'thumbnail') {
        canvas.toBlob((blob) => {
          window.dispatchEvent(
            new CustomEvent('thumbnail-ready', { detail: { blob } })
          );
          render(); // Restore after blob is created
        }, 'image/jpeg', 0.7);
      }
    };

    window.addEventListener('export-high-res', handleExport);
    return () => window.removeEventListener('export-high-res', handleExport);
  }, [render, mode, seed]);

  return (
    <canvas
      id="export-canvas"
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      className={`w-full h-full object-cover rounded-xl shadow-2xl ring-1 ring-zinc-800 ${
        mode === '3d' ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
      }`}
    />
  );
}
