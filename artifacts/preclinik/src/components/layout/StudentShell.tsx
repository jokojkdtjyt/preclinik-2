import React from 'react';
import { StudentSidebar } from './StudentSidebar';
import { Topbar } from './Topbar';

interface StudentShellProps {
  children: React.ReactNode;
  role: 'student' | 'admin';
  setRole: (role: 'student' | 'admin') => void;
}

export function StudentShell({ children, role, setRole }: StudentShellProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Topbar role={role} setRole={setRole} />
      <div className="flex flex-1">
        <StudentSidebar />
        <main className="flex-1 p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
