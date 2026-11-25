import {
  AlertTriangle,
  LayoutDashboard,
  Package,
  TrendingUp,
  X,
} from 'lucide-react';

export type NavRoute = 'dashboard' | 'inventory' | 'forecast' | 'priority';

interface SidebarProps {
  activeRoute: NavRoute;
  onNavigate: (route: NavRoute) => void;
  priorityAlertCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavGroup {
  label: string;
  items: Array<{
    id: NavRoute;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: number;
  }>;
}

export function Sidebar({
  activeRoute,
  onNavigate,
  priorityAlertCount,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const groups: NavGroup[] = [
    {
      label: 'Overview',
      items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
    },
    {
      label: 'Operations',
      items: [
        { id: 'inventory', label: 'Inventory', icon: Package },
        {
          id: 'priority',
          label: 'Priority Queue',
          icon: AlertTriangle,
          badge: priorityAlertCount > 0 ? priorityAlertCount : undefined,
        },
      ],
    },
    {
      label: 'Intelligence',
      items: [{ id: 'forecast', label: 'Demand Forecast', icon: TrendingUp }],
    },
  ];

  const handleSelect = (route: NavRoute) => {
    onNavigate(route);
    onCloseMobile();
  };

  const sidebarBody = (
    <div className="flex flex-col h-full bg-[#145A43] text-[#FFFEFA] select-none">
      {/* Brand Zone */}
      <div className="flex items-center justify-between px-5 py-5 bg-[#104735] border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#E6A23C] text-[#104735] flex items-center justify-center shrink-0 shadow-xs">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-5 h-5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5v-9z" />
              <path d="M12 12l9-4.5" />
              <path d="M12 12v9" />
              <path d="M12 12L3 7.5" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg font-bold tracking-tight leading-none text-[#FFFEFA]">
              SmartStock
            </div>
            <div className="text-[11px] text-[#D7E4DE] mt-1 truncate">
              Retail Demand & Supply
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-lg text-[#D7E4DE] hover:text-white hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6" aria-label="Main navigation">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-[#A9C7B9] uppercase">
              {group.label}
            </div>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeRoute === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                        active
                          ? 'bg-[#104735] text-[#FFFEFA] shadow-xs ring-1 ring-white/12'
                          : 'text-[#DCE8E2] hover:bg-[#104735]/60 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            active ? 'text-[#E6A23C]' : 'text-[#A9C7B9]'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.badge !== undefined && (
                        <span className="font-mono-num text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[#E6A23C] text-[#104735] shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom Profile Section */}
      <div className="p-4 bg-[#104735] border-t border-white/10">
        <div className="flex items-center gap-3">
          <img
            src="/src/assets/images/avatar_store_manager_1795627654741.jpg"
            alt="Ananya Sharma"
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-lg object-cover border border-white/20 shrink-0"
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#FFFEFA] truncate">
              Ananya Sharma
            </div>
            <div className="text-[11px] text-[#A9C7B9] truncate">
              Store Operations Lead
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-[#104735]">
        <div className="sticky top-0 h-screen">{sidebarBody}</div>
      </aside>

      {/* Mobile Collapsible Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#104735]/45 backdrop-blur-[2px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10">
            {sidebarBody}
          </aside>
        </div>
      )}
    </>
  );
}
