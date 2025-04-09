import { defineConfig, transformWithEsbuild } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  plugins: [
    {
      name: 'treat-js-files-as-jsx',
      async transform(code, id) {
        if (!id.match(/src\/.*\.js$/))  return null

        // Use the exposed transform from vite, instead of directly
        // transforming with esbuild
        return transformWithEsbuild(code, id, {
          loader: 'jsx',
          jsx: 'automatic',
        })
      },
    },
    react(),
    svgr(),
  ],

  optimizeDeps: {
    force: true,
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  server: {  // Development build
    host: '0.0.0.0',
    port: 3000, 
    open: true, 
    strictport: true
  },
  preview: {  // Production build
    port: 3000,  
    allowedHosts: ['the-3dpc-pc', 'localhost', '100.91.186.68'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  }
})