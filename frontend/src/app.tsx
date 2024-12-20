import { Routes, Route } from 'react-router';
import { Index } from '@/pages/index';
import { Login } from '@/pages/login';
import { Region } from '@/pages/region';
import { AppLayout } from '@/components/app-layout';

export function App() {
  return (
    <Routes>
      <Route index element={<Index />} />
      <Route path="login" element={<Login />} />

      <Route path="regions">
        <Route index element={<Index />} />
        <Route element={<AppLayout />}>
          <Route path=":regionId" element={<Region />} />
        </Route>
      </Route>
    </Routes>
  );
}
