import { useState } from 'react';
import { NavLink } from 'react-router';
import { LayoutDashboard, Users, FileJson, Terminal, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/objects', icon: Users, label: 'Browse Objects', end: false },
  { to: '/templates', icon: FileJson, label: 'Templates', end: false },
  { to: '/run', icon: Terminal, label: 'Run Commands', end: false },
] as const;

export function Sidebar() {
  const [expanded, setExpanded] = useState(true);

  return (
    <aside
      className={cn(
        'flex flex-col bg-muted border-r border-border transition-all duration-200 overflow-hidden shrink-0',
        expanded ? 'w-[220px]' : 'w-[56px]'
      )}
    >
      {/* Logo / app name row */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-border min-h-[56px]">
        {expanded && (
          <span className="text-sm font-semibold text-foreground truncate">EntraOps</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(e => !e)}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {expanded ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </Button>
      </div>

      {/* Navigation links */}
      <nav className="flex flex-col gap-1 p-2 flex-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
                'text-muted-foreground hover:bg-muted hover:text-foreground',
                isActive && [
                  'text-fluent-accent font-medium',
                  'bg-[oklch(0.52_0.22_261_/_0.08)]',
                  'border-l-2 border-fluent-accent pl-[6px]',
                ]
              )
            }
          >
            <Icon size={20} className="shrink-0" />
            {expanded && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
