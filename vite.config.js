import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Sur GitHub Pages le site est servi sous /contrats-paie/, pas à la racine.
// En développement on garde /, sinon localhost:5173 ne trouve plus rien.
export default defineConfig(({ command }) => ({
  plugins: [vue()],
  base: command === 'build' ? '/contrats-paie/' : '/',
  build: { target: 'es2020' },
}))
