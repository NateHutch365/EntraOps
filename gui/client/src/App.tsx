import { Routes, Route, Navigate } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Dashboard } from '@/pages/Dashboard';
import { ObjectBrowser } from '@/pages/ObjectBrowser';
import { ObjectDetail } from '@/pages/ObjectDetail';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { RunCommandsPage } from '@/pages/RunCommandsPage';
import { ConnectPage } from '@/pages/ConnectPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { ComparePage } from '@/pages/ComparePage';
import { Toaster } from '@/components/ui/sonner';

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="objects" element={<ObjectBrowser />} />
          <Route path="objects/:objectId" element={<ObjectDetail />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="history/compare" element={<ComparePage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="run" element={<RunCommandsPage />} />
          <Route path="connect" element={<ConnectPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
