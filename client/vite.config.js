import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env so we can inject Firebase config into the service worker
  const env = loadEnv(mode, process.cwd(), '');

  const firebaseConfig = {
    apiKey:            env.VITE_FIREBASE_API_KEY            || '',
    authDomain:        env.VITE_FIREBASE_AUTH_DOMAIN        || '',
    projectId:         env.VITE_FIREBASE_PROJECT_ID         || '',
    storageBucket:     env.VITE_FIREBASE_STORAGE_BUCKET     || '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId:             env.VITE_FIREBASE_APP_ID             || '',
  };

  return {
    define: {
      // Inject Firebase config into the service worker scope at build time
      // The SW cannot use ES module imports, so we pass config via self.__FIREBASE_CONFIG
      'self.__FIREBASE_CONFIG': JSON.stringify(firebaseConfig),
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // injectManifest lets us write a fully custom service worker
        // while still getting Workbox precaching via self.__WB_MANIFEST
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Expense Tracker',
          short_name: 'Expenses',
          description: 'Track your expenses efficiently',
          theme_color: '#ffffff',
          icons: [
            {
              src: '/icons/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icons/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/icons/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        devOptions: {
          enabled: true,
          type: 'module',
        }
      })
    ],
  };
})
