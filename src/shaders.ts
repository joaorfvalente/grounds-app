export const vertexShaderSource = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const commonHeader = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_seed;
  uniform vec3 u_colors[6];
  uniform int u_colorCount;
  uniform float u_brightness;
  uniform float u_contrast;
  uniform float u_vignette;
  uniform float u_grain;
  uniform float u_edgeSoftness;
  
  uniform int u_objCount;
  uniform float u_objType[10];
  uniform vec3 u_objPos[10];
  uniform vec3 u_objRot[10];
  uniform float u_objParam1[10];
  uniform float u_objParam2[10];
  uniform float u_objParam3[10];
  
  uniform float u_param1;
  uniform float u_param2;
  uniform float u_param3;
  uniform float u_param4;
  uniform float u_param5;
  uniform float u_param6;
  uniform float u_param7;
  uniform float u_param8;
  uniform float u_variant;

  // Simple pseudo-random
  float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  // High-quality scalar hash
  float hash12(vec2 p) {
      vec3 p3  = fract(vec3(p.xyx) * .1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
  }

  // High-quality 3D hash for RGB grain
  vec3 hash32(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
      p3 += dot(p3, p3.yxz+33.33);
      return fract((p3.xxy+p3.yzz)*p3.zyx);
  }

  // 2D Noise
  vec2 hash( vec2 p ) {
    p = vec2( dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)) );
    return -1.0 + 2.0*fract(sin(p)*43758.5453123);
  }

  float noise( in vec2 p ) {
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;
    vec2  i = floor( p + (p.x+p.y)*K1 );
    vec2  a = p - i + (i.x+i.y)*K2;
    float m = step(a.y,a.x); 
    vec2  o = vec2(m,1.0-m);
    vec2  b = a - o + K2;
    vec2  c = a - 1.0 + 2.0*K2;
    vec3  h = max( 0.5-vec3(dot(a,a), dot(b,b), dot(c,c) ), 0.0 );
    vec3  n = h*h*h*h*vec3( dot(a,hash(i+0.0)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));
    return dot( n, vec3(70.0) );
  }

  // FBM
  float fbm(vec2 st, int octaves) {
      float value = 0.0;
      float amplitude = .5;
      float frequency = 0.;
      for (int i = 0; i < 8; i++) {
          if (i >= octaves) break;
          value += amplitude * noise(st);
          st *= 2.;
          amplitude *= .5;
      }
      return value;
  }

  // Color interpolation (smooth)
  vec3 getPaletteColor(float t) {
      // Allow t to wrap smoothly if it goes slightly out of bounds
      // but clamp for safety in the main range
      t = clamp(t, 0.0, 1.0);
      float scaledT = t * float(u_colorCount - 1);
      int index = int(floor(scaledT));
      float fractT = fract(scaledT);
      
      // Pure linear interpolation in linear space gives the softest, most organic gradients
      // without the "banding" or "plateaus" caused by smootherstep.
      
      vec3 c1 = u_colors[0];
      vec3 c2 = u_colors[1];
      
      for(int i=0; i<6; i++) {
          if(i == index) c1 = u_colors[i];
          if(i == index + 1) c2 = u_colors[i];
          if(index >= u_colorCount - 1 && i == u_colorCount - 1) {
              c1 = u_colors[i];
              c2 = u_colors[i];
          }
      }
      
      // Blend in linear space for much better, less muddy color mixing
      c1 = pow(c1, vec3(2.2));
      c2 = pow(c2, vec3(2.2));
      vec3 mixed = mix(c1, c2, fractT);
      return pow(mixed, vec3(1.0 / 2.2));
  }

  // Post-processing
  vec3 applyPostFX(vec3 color, vec2 uv) {
      // Contrast & Brightness
      color = (color - 0.5) * u_contrast + 0.5 + u_brightness;
      
      // Vignette
      if (u_vignette > 0.0) {
          vec2 vUv = uv * (1.0 - uv.yx);
          float vig = vUv.x * vUv.y * 15.0; // intensity
          vig = pow(vig, u_vignette);
          color *= clamp(vig, 0.0, 1.0);
      }
      
      // Grain
      if (u_grain > 0.0) {
          // Film grain response curve (physically based on emulsion density)
          // Peaks at midtones, rolls off smoothly to shadows and highlights
          float lum = dot(color, vec3(0.2126, 0.7152, 0.0722)); // standard relative luminance
          float response = 2.0 * sqrt(max(lum * (1.0 - lum), 0.0)); // 0 at black/white, 1 at midgray
          response = mix(0.1, 1.0, response); // Keep a baseline of grain in extreme shadows/highlights
          
          // Grain size and coordinate (slightly larger than 1 pixel for filmic clumping)
          vec2 p = gl_FragCoord.xy / 1.5 + u_seed * 100.0;
          
          // Generate sophisticated noise with spatial correlation (clumping)
          vec3 n1 = hash32(p);
          vec3 n2 = hash32(p + vec2(0.5, 0.5)); // Offset sample for blur/clumping
          vec3 n3 = hash32(p + vec2(-0.5, 0.5));
          
          // Average samples for a Gaussian-like distribution and softer texture
          vec3 noiseCol = (n1 + n2 + n3) / 3.0 - 0.5;
          
          // Monochromatic vs Chromatic blend
          float mono = (noiseCol.r + noiseCol.g + noiseCol.b) / 3.0;
          noiseCol = mix(vec3(mono), noiseCol, 0.35); // 35% chromatic noise
          
          // Apply grain (multiply by 3.0 to compensate for the averaging which reduces amplitude)
          color += noiseCol * u_grain * response * 3.0;
      }
      
      // Dithering to eliminate color banding in smooth gradients
      float dither = random(gl_FragCoord.xy + u_seed * 123.456) / 255.0;
      color += vec3(dither - (0.5 / 255.0));
      
      return clamp(color, 0.0, 1.0);
  }
`;

export const geometricGridShader = `
  ${commonHeader}
  void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      float aspect = u_resolution.x / u_resolution.y;
      uv.x *= aspect;
      
      float cells = u_param1;
      float jitter = u_param2;
      float rotation = radians(u_param3);
      float thickness = u_param4;
      float roundness = u_param5;
      float noiseScale = u_param6;
      
      // Rotate
      float s = sin(rotation);
      float c = cos(rotation);
      mat2 rot = mat2(c, -s, s, c);
      vec2 st = rot * uv;
      
      st *= cells;
      vec2 i_st = floor(st);
      vec2 f_st = fract(st);
      
      // Jitter
      vec2 offset = vec2(random(i_st + u_seed), random(i_st + u_seed + 1.0)) * jitter;
      f_st += offset - 0.5 * jitter;
      
      float shape = 0.0;
      int variant = int(u_variant);
      float edge = max(0.001, u_edgeSoftness * 0.5);
      
      if (variant == 0) {
          // Grid
          shape = smoothstep(thickness, thickness + edge, f_st.x) * 
                  smoothstep(thickness, thickness + edge, f_st.y) *
                  smoothstep(thickness, thickness + edge, 1.0 - f_st.x) *
                  smoothstep(thickness, thickness + edge, 1.0 - f_st.y);
          shape = 1.0 - shape;
      } else if (variant == 1) {
          // Dots
          float dist = length(f_st - 0.5);
          shape = 1.0 - smoothstep(thickness - edge, thickness, dist);
      } else {
          // Hexagons (simplified as diamonds)
          float dist = abs(f_st.x - 0.5) + abs(f_st.y - 0.5);
          shape = 1.0 - smoothstep(thickness - edge, thickness, dist);
      }
      
      vec3 color = mix(u_colors[0], u_colors[1], shape);
      
      // Add some color variation based on cell
      float cellNoise = random(i_st + u_seed) * noiseScale;
      color = mix(color, getPaletteColor(cellNoise), shape * 0.8);
      
      gl_FragColor = vec4(applyPostFX(color, gl_FragCoord.xy / u_resolution.xy), 1.0);
  }
`;

export const gradientAuroraShader = `
  ${commonHeader}
  void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      float aspect = u_resolution.x / u_resolution.y;
      
      float complexity = u_param1;
      float distortion = u_param2;
      float scale = u_param3;
      float colorShift = u_param4;
      float cx = u_param5;
      float cy = u_param6;
      
      vec2 p = uv;
      p.x *= aspect;
      p *= scale;
      float t = u_seed;
      
      int variant = int(u_variant);
      vec3 finalColor = vec3(0.0);
      
      if (variant == 0) {
          // True Mesh Gradient (Fluid Blobs)
          vec3 col = vec3(0.0);
          float totalWeight = 0.0;
          
          // Fluid domain warping
          vec2 warpedP = p;
          warpedP.x += fbm(p * distortion + t * 0.1, 2) * distortion * 0.5;
          warpedP.y += fbm(p * distortion + vec2(5.2, 1.3) + t * 0.1, 2) * distortion * 0.5;
          
          for(int i=0; i<6; i++) {
              if (i >= u_colorCount) break;
              
              float fi = float(i);
              float offset = fi * 137.54 + u_seed;
              
              // Organic movement
              vec2 pos = vec2(
                  sin(t * 0.15 + offset) * 0.6 + 0.5,
                  cos(t * 0.11 + offset * 1.2) * 0.6 + 0.5
              );
              pos.x *= aspect;
              
              float dist = length(warpedP - pos);
              
              // Soft exponential falloff for that diffuse mesh look
              float spread = (11.0 - complexity) * 0.15; // complexity 1-10 -> spread 1.5 to 0.15
              float weight = exp(-(dist * dist) / (spread * spread));
              
              vec3 linearColor = pow(u_colors[i], vec3(2.2));
              
              col += linearColor * weight;
              totalWeight += weight;
          }
          
          // Normalize
          if (totalWeight > 0.0) {
              col /= totalWeight;
          } else {
              col = pow(u_colors[0], vec3(2.2));
          }
          
          finalColor = pow(col, vec3(1.0 / 2.2));
          
      } else {
          float f = 0.0;
          if (variant == 1) {
              // Aurora
              p *= complexity;
              vec2 q = vec2(0.);
              q.x = fbm(p + vec2(t), 4);
              q.y = fbm(p + vec2(1.0, 2.0) + t, 4);
              
              vec2 r = vec2(0.);
              r.x = fbm(p + distortion * q + vec2(1.7, 9.2) + 0.15 * t, 4);
              r.y = fbm(p + distortion * q + vec2(8.3, 2.8) + 0.126 * t, 4);
              
              f = fbm(p + r * distortion, 4);
          } else if (variant == 2) {
              // Radial
              vec2 center = vec2(cx * aspect, cy) * scale;
              float dist = length(p - center);
              f = dist * complexity - t * distortion;
              f = sin(f) * 0.5 + 0.5;
          } else {
              // Conic
              vec2 center = vec2(cx * aspect, cy) * scale;
              vec2 dir = p - center;
              float angle = atan(dir.y, dir.x);
              f = (angle / 6.28318) + 0.5 + t * 0.1;
              f += fbm(p * complexity, 3) * distortion;
              f = fract(f);
          }
          finalColor = getPaletteColor(f * 1.5 - 0.2 + colorShift);
      }
      
      gl_FragColor = vec4(applyPostFX(finalColor, uv), 1.0);
  }
`;

export const abstractFlowShader = `
  ${commonHeader}
  void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      float aspect = u_resolution.x / u_resolution.y;
      uv.x *= aspect;
      
      float density = u_param1;
      float curl = u_param2;
      float speed = u_param3;
      float detail = u_param4;
      float warp = u_param5;
      float contrast = u_param6;
      
      vec2 p = uv * density;
      float t = u_seed * speed;
      
      int variant = int(u_variant);
      float val = 0.0;
      
      if (variant == 0) {
          // Liquid / Glossy
          vec2 q = vec2(fbm(p + t * 0.5, 3), fbm(p + vec2(5.2, 1.3) - t * 0.5, 3));
          vec2 r = vec2(fbm(p + q * warp + t * 0.2, 3), fbm(p + q * warp - t * 0.2, 3));
          val = fbm(p + r * curl, 4);
          
          // Add glossy highlights
          float highlight = smoothstep(0.4, 0.6, val) * smoothstep(0.8, 0.6, val);
          val = val + highlight * detail * 0.5;
          
          // Increase contrast for liquid
          val = (val - 0.5) * contrast + 0.5;
      } else if (variant == 1) {
          // Flow Field
          float n1 = noise(p + t);
          float n2 = noise(p + vec2(5.2, 1.3) - t);
          vec2 flow = vec2(n1, n2) * curl;
          val = sin(flow.x * detail) * cos(flow.y * detail);
          val = val * 0.5 + 0.5;
          val = (val - 0.5) * contrast + 0.5;
      } else if (variant == 2) {
          // Swirl
          vec2 center = vec2(0.5 * aspect, 0.5) * density;
          vec2 dir = p - center;
          float dist = length(dir);
          float angle = atan(dir.y, dir.x) + dist * curl - t;
          val = sin(angle * detail) * 0.5 + 0.5;
          val += noise(p * warp) * 0.2;
          val = (val - 0.5) * contrast + 0.5;
      } else {
          // Voronoi
          vec2 i_p = floor(p);
          vec2 f_p = fract(p);
          float minDist = 1.0;
          for(int y = -1; y <= 1; y++) {
              for(int x = -1; x <= 1; x++) {
                  vec2 neighbor = vec2(float(x), float(y));
                  vec2 point = hash(i_p + neighbor);
                  point = 0.5 + 0.5 * sin(t + 6.2831 * point);
                  vec2 diff = neighbor + point - f_p;
                  float dist = length(diff);
                  minDist = min(minDist, dist);
              }
          }
          val = minDist * curl;
          val = (val - 0.5) * contrast + 0.5;
      }
      
      vec3 color = getPaletteColor(val);
      
      gl_FragColor = vec4(applyPostFX(color, gl_FragCoord.xy / u_resolution.xy), 1.0);
  }
`;

export const noiseFbmShader = `
  ${commonHeader}
  void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      float aspect = u_resolution.x / u_resolution.y;
      uv.x *= aspect;
      
      int octaves = int(u_param1);
      float freq = u_param2;
      float amp = u_param3;
      float lacunarity = u_param4;
      float gain = u_param5;
      float ridgeThreshold = u_param6;
      
      vec2 p = uv * freq;
      float t = u_seed;
      p += t;
      
      int variant = int(u_variant);
      float f = 0.0;
      
      if (variant == 0) {
          // Standard FBM
          float amplitude = 0.5;
          for (int i = 0; i < 8; i++) {
              if (i >= octaves) break;
              f += amplitude * noise(p);
              p *= lacunarity;
              amplitude *= gain;
          }
          f = f * amp * 0.5 + 0.5;
      } else if (variant == 1) {
          // Value Noise
          f = noise(p * lacunarity) * amp;
          f = f * 0.5 + 0.5;
      } else {
          // Ridged
          float amplitude = 0.5;
          for (int i = 0; i < 8; i++) {
              if (i >= octaves) break;
              float n = abs(noise(p));
              n = ridgeThreshold - n;
              n *= n;
              f += amplitude * n;
              p *= lacunarity;
              amplitude *= gain;
          }
          f = f * amp;
      }
      
      vec3 color = getPaletteColor(f);
      gl_FragColor = vec4(applyPostFX(color, gl_FragCoord.xy / u_resolution.xy), 1.0);
  }
`;

export const creativeMetaballsShader = `
  ${commonHeader}
  void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      float aspect = u_resolution.x / u_resolution.y;
      uv.x *= aspect;
      
      float complexity = u_param1;
      float distortion = u_param2;
      float size = u_param3;
      float spread = u_param4;
      float glow = u_param5;
      float iteration = u_param6;
      
      float t = u_seed;
      int variant = int(u_variant);
      
      vec3 color = u_colors[0];
      
      if (variant == 0) {
          // Metaballs
          float v = 0.0;
          for(int i=0; i<10; i++) {
              if(float(i) >= complexity) break;
              float fi = float(i) + 1.0;
              vec2 pos = vec2(
                  sin(t * 0.3 * fi + u_seed * fi) * 0.4 * spread * aspect + 0.5 * aspect,
                  cos(t * 0.4 * fi + u_seed * fi) * 0.4 * spread + 0.5
              );
              float radius = size + size * sin(t * fi);
              float dist = length(uv - pos);
              v += radius / (dist * dist + 0.001);
          }
          float threshold = 15.0 - distortion * 10.0;
          float edge = max(0.001, u_edgeSoftness * 5.0);
          float smooth_v = smoothstep(threshold - edge, threshold + edge, v);
          float inner = smoothstep(threshold, threshold + glow, v);
          color = mix(u_colors[0], getPaletteColor(inner), smooth_v);
      } else if (variant == 1) {
          // Starfield
          float v = 0.0;
          vec2 p = uv * spread * 10.0;
          for(int i=0; i<3; i++) {
              if (float(i) >= complexity / 3.0) break;
              vec2 i_p = floor(p);
              vec2 f_p = fract(p);
              vec2 point = hash(i_p + u_seed);
              float dist = length(f_p - (0.5 + 0.4 * sin(t + 6.28 * point)));
              v += (size * 0.5) / (dist * dist + 0.001);
              p *= 2.0;
          }
          color = mix(u_colors[0], getPaletteColor(v), min(v * glow, 1.0));
      } else {
          // Fractal
          vec2 z = (uv - vec2(0.5 * aspect, 0.5)) * spread * 4.0;
          vec2 c = vec2(sin(t)*0.5, cos(t)*0.5) * distortion;
          float n = 0.0;
          int maxIter = int(iteration * 10.0) + 10;
          for(int i=0; i<100; i++) {
              if(i >= maxIter) break;
              if(length(z) > 4.0) break;
              z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
              n += 1.0;
          }
          float f = n / float(maxIter);
          color = getPaletteColor(f * glow);
      }
      
      gl_FragColor = vec4(applyPostFX(color, gl_FragCoord.xy / u_resolution.xy), 1.0);
  }
`;

export const wavesShader = `
  ${commonHeader}
  void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      float aspect = u_resolution.x / u_resolution.y;
      uv.x *= aspect;
      
      float freq = u_param1;
      float amp = u_param2;
      float phase = u_param3 + u_seed;
      float complexity = u_param4;
      float thickness = u_param5;
      float verticalShift = u_param6;
      
      float v = 0.0;
      vec2 p = uv;
      p.y -= 0.5 + verticalShift;
      
      int variant = int(u_variant);
      
      for(float i = 1.0; i <= 10.0; i++) {
          if(i > complexity) break;
          
          float wave = 0.0;
          float x = p.x * freq * i + phase * i;
          
          if (variant == 0) {
              // Sine
              wave = sin(x) * (amp / i);
          } else if (variant == 1) {
              // Pulse
              wave = abs(sin(x)) * (amp / i);
          } else {
              // Sawtooth
              wave = (fract(x / 6.28) * 2.0 - 1.0) * (amp / i);
          }
          
          float dist = abs(p.y - wave);
          float edge = max(0.001, u_edgeSoftness * 0.1);
          v += thickness / (dist + edge); 
      }
      
      vec3 color = getPaletteColor(v * 0.3);
      gl_FragColor = vec4(applyPostFX(color, gl_FragCoord.xy / u_resolution.xy), 1.0);
  }
`;

export const raymarchShader = `
  ${commonHeader}
  
  mat2 rot(float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c);
  }
  
  float sdBox( vec3 p, vec3 b ) {
    vec3 q = abs(p) - b;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
  }
  
  float sdTorus( vec3 p, vec2 t ) {
    vec2 q = vec2(length(p.xz)-t.x,p.y);
    return length(q)-t.y;
  }
  
  float sdCappedCylinder( vec3 p, float h, float r ) {
    vec2 d = abs(vec2(length(p.xz),p.y)) - vec2(r,h);
    return min(max(d.x,d.y),0.0) + length(max(d,0.0));
  }
  
  float sdOctahedron( vec3 p, float s) {
    p = abs(p);
    return (p.x+p.y+p.z-s)*0.57735027;
  }
  
  float sdCapsule( vec3 p, float h, float r ) {
    p.y -= clamp( p.y, -h, h );
    return length( p ) - r;
  }
  
  float smin( float a, float b, float k ) {
      float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
      return mix( b, a, h ) - k*h*(1.0-h);
  }

  float getShape(vec3 p, float shape, float p1, float p2, float p3) {
      if (shape == 0.0) return length(p) - p1; // Sphere
      if (shape == 1.0) return sdBox(p, vec3(p1, p2, p3)); // Box
      if (shape == 2.0) return sdTorus(p, vec2(p1, p2)); // Torus
      if (shape == 3.0) return sdCappedCylinder(p, p2, p1); // Cylinder
      if (shape == 4.0) return sdOctahedron(p, p1); // Octahedron
      return sdCapsule(p, p2, p1); // Capsule
  }
  
  float map(vec3 p) {
      int variant = int(u_variant);
      
      if (variant == 1) {
          // Infinite City
          p.xz = mod(p.xz + 1.0, 2.0) - 1.0;
      } else if (variant == 2) {
          // Floating Array
          p.xyz = mod(p.xyz + 2.0, 4.0) - 2.0;
      }
      
      // Fixed isometric-ish camera angle
      p.yz *= rot(radians(35.264));
      p.xz *= rot(radians(45.0));
      
      float d = 1000.0;
      float k = max(0.001, u_edgeSoftness * 2.0); // Softness factor
      
      if (u_objCount == 0) {
          // Fallback if no objects
          float shape = floor(u_param1);
          if (shape == 0.0) d = getShape(p, shape, 1.0, 0.0, 0.0);
          else if (shape == 1.0) d = getShape(p, shape, 0.7, 0.7, 0.7);
          else if (shape == 2.0) d = getShape(p, shape, 0.8, 0.3, 0.0);
          else if (shape == 3.0) d = getShape(p, shape, 0.5, 0.8, 0.0);
          else if (shape == 4.0) d = getShape(p, shape, 1.2, 0.0, 0.0);
          else d = getShape(p, shape, 0.4, 0.6, 0.0);
      } else {
          for (int i = 0; i < 10; i++) {
              if (i >= u_objCount) break;
              vec3 objP = p - u_objPos[i];
              
              objP.yz *= rot(radians(u_objRot[i].x));
              objP.xz *= rot(radians(u_objRot[i].y));
              objP.xy *= rot(radians(u_objRot[i].z));
              
              float objD = getShape(objP, u_objType[i], u_objParam1[i], u_objParam2[i], u_objParam3[i]);
              if (i == 0) {
                  d = objD;
              } else {
                  d = smin(d, objD, k);
              }
          }
      }
      return d;
  }
  
  vec3 calcNormal(vec3 p) {
      vec2 e = vec2(0.001, 0.0);
      return normalize(vec3(
          map(p + e.xyy) - map(p - e.xyy),
          map(p + e.yxy) - map(p - e.yxy),
          map(p + e.yyx) - map(p - e.yyx)
      ));
  }
  
  void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
      
      float lightAngle = radians(u_param1);
      float lightElevation = radians(u_param2);
      float ambientLight = u_param3;
      float diffuseIntensity = u_param4;
      float fresnelIntensity = u_param5;
      float fresnelPower = u_param6;
      
      float zoom = 0.0;
      float posX = 0.0;
      float posY = 0.0;
      
      vec3 ro = vec3(-posX, -posY, -3.0 - zoom);
      vec3 rd = normalize(vec3(uv, 1.0));
      
      float t = 0.0;
      for(int i = 0; i < 80; i++) {
          vec3 p = ro + rd * t;
          float d = map(p);
          if(d < 0.001 || t > 20.0) break;
          t += d;
      }
      
      vec3 color = u_colors[0]; // background
      if(t < 20.0) {
          vec3 p = ro + rd * t;
          vec3 n = calcNormal(p);
          
          vec3 light = normalize(vec3(
              cos(lightElevation) * sin(lightAngle),
              sin(lightElevation),
              cos(lightElevation) * cos(lightAngle)
          ));
          
          float diff = max(dot(n, light), 0.0);
          float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), fresnelPower);
          
          float lightTotal = ambientLight + diff * diffuseIntensity + fresnel * fresnelIntensity;
          color = getPaletteColor(lightTotal);
      }
      
      gl_FragColor = vec4(applyPostFX(color, gl_FragCoord.xy / u_resolution.xy), 1.0);
  }
`;

export const shaders: Record<string, string> = {
  geometric: geometricGridShader,
  gradient: gradientAuroraShader,
  abstract: abstractFlowShader,
  noise: noiseFbmShader,
  creative: creativeMetaballsShader,
  waves: wavesShader,
  '3d': raymarchShader,
};
