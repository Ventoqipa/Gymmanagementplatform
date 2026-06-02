import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const securityProxyTarget =
    env.VITE_SECURITY_API_PROXY_TARGET ?? 'https://apisecurityegtest.tanosi.com.mx'
  const posProxyTarget =
    env.VITE_POS_API_PROXY_TARGET ?? 'https://pos.elitegym247.tanosi.com.mx'

  return {
    plugins: [
      figmaAssetResolver(),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    server: {
      proxy: {
        /**
         * El navegador llama a localhost/security-api → Vite reenvía al API real.
         * Postman no necesita esto; el browser sí (política CORS).
         */
        '/security-api': {
          target: securityProxyTarget,
          changeOrigin: true,
          // Neubox: el certificado a veces es del host svw*.serverneubox.com.mx
          // y no del subdominio apisecurityegtest.* — Postman lo tolera, Node no.
          secure: false,
          rewrite: (p) => p.replace(/^\/security-api/, ''),
        },
        '/pos-api': {
          target: posProxyTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/pos-api/, ''),
        },
      },
    },

    assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
