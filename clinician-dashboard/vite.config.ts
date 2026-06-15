import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174, // Different port from the patient app (5173)
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
