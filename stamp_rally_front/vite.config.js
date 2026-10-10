import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { readFileSync } from 'node:fs'

// 画面の URL の一覧(src/routes.json)を、ビルドしたときに dist にもそのまま出す
// 本番では Go のサーバーがこれを読み、一覧に無い URL にステータス 404 を返す(go_back/main.go の serveFrontend)
// 一覧を画面とサーバーで別々に持たず、src/routes.json の 1 か所にするため
function emitRoutes() {
  return {
    name: 'emit-routes',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'routes.json',
        source: readFileSync(new URL('./src/routes.json', import.meta.url), 'utf8'),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    // 開発サーバーを自己署名証明書で HTTPS にする
    // (Android の Web NFC は HTTPS でないと使えない。本番も HTTPS なので同じ条件で試せる)
    basicSsl(),
    emitRoutes(),
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
