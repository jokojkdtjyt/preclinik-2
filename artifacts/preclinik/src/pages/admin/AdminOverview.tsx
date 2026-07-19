import React from 'react';
import { useGetAdminStats } from '@workspace/api-client-react';
import { Library, BookOpen, Users, Activity, PlayCircle } from 'lucide-react';
import { useLocation } from 'wouter';

export default function AdminOverview() {
  const { data: stats } = useGetAdminStats();
  const [, navigate] = useLocation();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and recent activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[22px] border border-border shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Library className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-mono mb-1">Total Modules</div>
            <div className="text-3xl font-serif font-bold text-foreground">{stats?.totalModules || 0}</div>
            <div className="text-xs text-green-600 font-mono mt-1 font-bold">{stats?.liveModules || 0} Live</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[22px] border border-border shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#b9852e] flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-mono mb-1">Total Lessons</div>
            <div className="text-3xl font-serif font-bold text-foreground">{stats?.totalLessons || 0}</div>
            <div className="text-xs text-green-600 font-mono mt-1 font-bold">{stats?.liveLessons || 0} Live</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[22px] border border-border shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-700 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-mono mb-1">Total Students</div>
            <div className="text-3xl font-serif font-bold text-foreground">{stats?.totalStudents || 0}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[22px] border border-border shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-mono mb-1">System Status</div>
            <div className="text-xl font-serif font-bold text-foreground mt-2">Operational</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[22px] border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border bg-secondary/30">
          <h2 className="font-serif font-bold text-lg">Quick Actions</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button onClick={() => navigate('/admin/lessons')} className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-secondary hover:border-primary/30 transition-all text-left">
            <div className="w-10 h-10 rounded-full bg-[#b9852e] text-white flex items-center justify-center shrink-0">
              <PlayCircle className="w-5 h-5"/>
            </div>
            <div>
              <div className="font-bold text-foreground text-sm">Upload Lesson</div>
              <div className="text-xs text-muted-foreground font-mono mt-1">Add video to module</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
