import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { LayoutDashboard, Library, PlaySquare, FileQuestion, ChevronRight, ChevronLeft } from 'lucide-react';

export function StudentSidebar() {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState(false);

  // If in lesson player, force collapse or hide? Prompt says force collapse, but let's just use state and if we're on a lesson page we can pass a prop, or just let local state handle it, but wait, the spec says "sidebar force-collapses when entering this page".
  // Actually, I can just derive expanded from location if it's a lesson page it's false, otherwise it uses state.
  const isLessonPage = location.includes('/lessons/');
  const isExpanded = !isLessonPage && expanded;

  const links = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/catalog', label: 'Module catalog', icon: Library },
    { href: '/my-learning', label: 'My learning', icon: PlaySquare },
    { href: '/progress', label: 'Progress', icon: FileQuestion },
  ];

  return (
    <aside 
      className={`h-[calc(100vh-72px)] sticky top-[72px] bg-white border-r border-border transition-all duration-300 flex flex-col z-30 ${isExpanded ? 'w-[248px]' : 'w-[72px]'}`}
    >
      <nav className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-hidden">
        {links.map((link) => {
          const active = location === link.href || (link.href !== '/' && location.startsWith(link.href));
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-colors whitespace-nowrap ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
              <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-primary' : ''}`} />
              <span className={`text-sm font-medium transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {!isLessonPage && (
        <div className="p-3 border-t border-border">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center p-3 rounded-xl hover:bg-secondary text-muted-foreground transition-colors"
          >
            {isExpanded ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      )}
    </aside>
  );
}
