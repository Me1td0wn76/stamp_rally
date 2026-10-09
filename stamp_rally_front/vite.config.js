import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    // 開発サーバーを自己署名証明書で HTTPS にする
    // (Android の Web NFC は HTTPS でないと使えない。本番も HTTPS なので同じ条件で試せる)
    basicSsl(),
  ],
  server: {
    // LAN 内のスマホから https://<PCのIP>:5173 で開けるようにする
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // X-Forwarded-Proto: https をバックエンドに渡し、Cookie に Secure を付けさせる(auth.go の isSecureRequest)
        xfwd: true,
      },
    },
  },
})
