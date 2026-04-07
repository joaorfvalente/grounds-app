# Grounds

An interactive background generator built with WebGL shaders. Create, customize, save, and share animated backgrounds.

**Live App:** https://groundsapp.netlify.app

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

2. Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. Set up Supabase:
   - Create `presets` and `profiles` tables
   - Add a foreign key from `presets.user_id` to `profiles.id`
   - Create a `thumbnails` storage bucket (public) with RLS policies allowing authenticated uploads and public reads
   - In **Authentication → URL Configuration**, set **Site URL** to `https://groundsapp.netlify.app` and add **Redirect URLs** for `http://localhost:3000` and `https://groundsapp.netlify.app`

4. Run the dev server:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:3000`.

## Netlify (production)

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the site’s environment (same values as local `.env`). The live app is served at **https://groundsapp.netlify.app**; OAuth uses `window.location.origin`, so no code change is needed when the Netlify hostname changes, as long as Supabase redirect URLs include that host.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Type-check with TypeScript |
| `npm run clean` | Remove dist folder |
