import { Outlet } from 'react-router';

export function AppLayout() {
  return (
    <div className="min-h-svh w-full flex flex-col">
      <Outlet />
    </div>
  );
}
