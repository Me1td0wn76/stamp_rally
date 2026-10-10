import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import MockApp from './components/MockApp.jsx'
import RedesignApp from './redesign/RedesignApp.jsx'
// 管理画面の本体は、/admin を開いたときに初めて読み込む（AdminRoute.jsx）
import AdminRoute from './admin/AdminRoute.jsx'
import ErrorPage from './redesign/ErrorPage.jsx'
import { initialSpotToken } from './redesign/spotToken.js'
// 画面の URL の一覧。サーバー（go_back/main.go）もビルドで dist に出したこのファイルを読んで、ここに無い URL にステータス 404 を返す
// pages はその URL だけの画面、sections はその URL と下のページ全部（/admin/codeflow など）の画面
// 画面を足したり減らしたりするときは routes.json を直す（サーバーの一覧はそれで揃う）
import routes from './routes.json'

// 本番の画面は redesign に差し替えた（/redesign は試していたときの URL。同じ画面が開く）
// 前の画面（App.jsx）はファイルだけ残している
// routes.json に無い URL は 404 の画面を出す
// ただし NFCタグ・QRコードの URL(?spot=<トークン>)は、パスが違っていても（/foo?spot=... など）404 にせず / のビンゴ画面でスタンプを取る
// （トークンは spotToken.js が読み込み時に URL から消しているので、404 の画面を出すと再読み込みでスタンプが取れなくなる）
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path={routes.pages.mock} element={<MockApp />} />
        <Route path={routes.pages.redesign} element={<RedesignApp />} />
        {/* 管理画面（パスワードが必要。来場者の画面からはリンクしない）。管理画面の中の存在しないページは AdminApp が /admin に戻す */}
        <Route path={`${routes.sections.admin}/*`} element={<AdminRoute />} />
        <Route path={routes.pages.top} element={<RedesignApp />} />
        <Route path="*" element={initialSpotToken ? <Navigate to="/" replace /> : <ErrorPage status={404} />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
