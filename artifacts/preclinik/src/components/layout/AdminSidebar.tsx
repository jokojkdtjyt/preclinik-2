import React from 'react';
import { Link, useLocation } from 'wouter';
import { LayoutDashboard, Library, BookOpen, Users, Settings, Receipt } from 'lucide-react';

export function AdminSidebar() {
  const [location] = useLocation();

  const links = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/modules', label: 'Modules', icon: Library },
    { href: '/admin/lessons', label: 'Lessons', icon: BookOpen },
    { href: '/admin/students', label: 'Students', icon: Users },
    { href: '/admin/purchases', label: 'Purchase Requests', icon: Receipt },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="h-[calc(100vh-72px)] w-[248px] sticky top-[72px] bg-white border-r border-border flex flex-col z-30">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">Admin Panel</h2>
      </div>
      <nav className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto">
        {links.map((link) => {
          const active = location === link.href || (link.href !== '/admin' && location.startsWith(link.href));
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground font-bold' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
