import React from 'react';
import { useListAdminStudents } from '@workspace/api-client-react';
import { Users, Search, MoreHorizontal } from 'lucide-react';

export default function AdminStudents() {
  const { data: students, isLoading } = useListAdminStudents();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Student Directory</h1>
          <p className="text-muted-foreground">View enrolled students and their progress.</p>
        </div>
      </div>

      <div className="bg-white rounded-[22px] border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border bg-secondary/30 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search students..."
              className="w-full h-10 bg-white border border-border hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-10 pr-4 outline-none transition-all font-mono text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/20 border-b border-border text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
                <th className="p-5 font-bold">Student</th>
                <th className="p-5 font-bold">Progress</th>
                <th className="p-5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={3} className="p-8 text-center text-muted-foreground font-mono">Loading students...</td></tr>
              ) : students?.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-16 text-center">
                    <Users className="w-12 h-12 text-muted-foreground opacity-20 mx-auto mb-4" />
                    <p className="text-foreground font-bold">No students registered.</p>
                  </td>
                </tr>
              ) : (
                students?.map(student => (
                  <tr key={student.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-serif font-bold border border-border">
                          {student.name.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-sm">{student.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 w-64">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${student.progressPercent}%` }} />
                        </div>
                        <span className="text-xs font-mono font-bold">{student.progressPercent}%</span>
                      </div>
                    </td>
                    <td className="p-5 text-right">
                      <button className="p-2 text-muted-foreground hover:bg-secondary rounded-lg transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
