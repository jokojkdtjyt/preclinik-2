import React from 'react';
import { AdminSidebar } from './AdminSidebar';
import { Topbar } from './Topbar';

interface AdminShellProps {
  children: React.ReactNode;
  role: 'student' | 'admin';
  setRole: (role: 'student' | 'admin') => void;
}

export function AdminShell({ children, role, setRole }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Topbar role={role} setRole={setRole} />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 p-6 md:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
