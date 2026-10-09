import { lazy, Suspense } from 'react';

// 管理画面は来場者が開かないので、/admin を開いたときに初めて読み込む（来場者の読み込みを増やさないため）
const AdminApp = lazy(() => import('./AdminApp.jsx'));

export default function AdminRoute() {
  return (
    <Suspense fallback={null}>
      <AdminApp />
    </Suspense>
  );
}
