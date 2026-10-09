import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import MockApp from './components/MockApp.jsx'
import RedesignApp from './redesign/RedesignApp.jsx'

// 本番の画面は redesign に差し替えた（/redesign は試していたときの URL。同じ画面が開く）
// 前の画面（App.jsx）はファイルだけ残している
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/mock/*" element={<MockApp />} />
        <Route path="/redesign/*" element={<RedesignApp />} />
        <Route path="/*" element={<RedesignApp />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
