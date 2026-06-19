import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets are loaded relatively on GitHub Pages
  build: {
    outDir: 'dist',
  },
  server: {
    proxy: {
      '/api/ytm': {
        target: 'https://music.youtube.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ytm/, ''),
        headers: {
          'Cookie': 'SOCS=CAESEwgDEgk0ODE3Nzk3NTQaAmVuIAEaBgiA_LyaBg; CONSENT=YES+pl.pl+20240101-00-0;',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://music.youtube.com/'
        }
      }
    }
  }
})
