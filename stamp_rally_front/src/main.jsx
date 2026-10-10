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

// 本番の画面は redesign に差し替えた（/redesign は試していたときの URL。同じ画面が開く）
// 前の画面（App.jsx）はファイルだけ残している
// ここに無い URL は 404 の画面を出す。URL を足したり減らしたりしたときは、サーバー（go_back/main.go の isFrontendPage）も合わせる
// ただし NFCタグ・QRコードの URL(?spot=<トークン>)は、パスが違っていても（/foo?spot=... など）404 にせず / のビンゴ画面でスタンプを取る
// （トークンは spotToken.js が読み込み時に URL から消しているので、404 の画面を出すと再読み込みでスタンプが取れなくなる）
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/mock" element={<MockApp />} />
        <Route path="/redesign" element={<RedesignApp />} />
        {/* 管理画面（パスワードが必要。来場者の画面からはリンクしない）。管理画面の中の存在しないページは AdminApp が /admin に戻す */}
        <Route path="/admin/*" element={<AdminRoute />} />
        <Route path="/" element={<RedesignApp />} />
        <Route path="*" element={initialSpotToken ? <Navigate to="/" replace /> : <ErrorPage status={404} />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
