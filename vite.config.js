import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/', // <--- Adicione esta linha para corrigir o caminho dos assets em produção
  server: {
    port: 5174,
    open: true,
    proxy: {
      '/api-fipe': {
        target: 'https://parallelum.com.br/fipe/api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-fipe/, ''),
      },
    },
  },
});