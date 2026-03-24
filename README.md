<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Grounds

An interactive background generator built with WebGL shaders. Create, customize, save, and share animated backgrounds.

**Live App:** https://unique-druid-0936ac.netlify.app

## Features

- **Shader Editor** — 7 shader modes (Geometric, Gradient, Abstract Flow, Noise, Metaballs, Waves, 3D Raymarching) each with multiple variants
- **Real-time Controls** — Adjust density, colors, animation, detail, and post-processing (brightness, contrast, vignette, grain)
- **Custom Color Palettes** — Pick and interpolate custom colors across all shaders
- **Export** — Save at multiple resolutions from Instagram squares to 4K UHD and print sizes
- **Community Library** — Browse, fork, and share backgrounds with other users
- **User Accounts** — Google OAuth via Supabase for saving and managing your creations

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Zustand
- **Rendering:** WebGL / GLSL shaders
- **Backend:** Supabase (auth, database, storage)
- **Build:** Vite
- **Hosting:** Netlify

## Getting Started

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. Run the dev server:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:3000`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Type-check with TypeScript |
| `npm run clean` | Remove dist folder |
