import { Routes, Route, Navigate } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Dashboard } from '@/pages/Dashboard';
import { ObjectBrowser } from '@/pages/ObjectBrowser';
import { ObjectDetail } from '@/pages/ObjectDetail';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { RunCommandsPage } from '@/pages/RunCommandsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="objects" element={<ObjectBrowser />} />
        <Route path="objects/:objectId" element={<ObjectDetail />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="run" element={<RunCommandsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
