'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, TrendingUp, BarChart3, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/accounts', icon: Wallet, label: 'Accounts' },
  { href: '/income', icon: TrendingUp, label: 'Income' },
  { href: '/projections', icon: BarChart3, label: 'Project' },
  { href: '/insights', icon: Lightbulb, label: 'Insights' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100 pb-safe">
      <div className="flex items-stretch">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 pt-2 pb-2 text-xs font-medium transition-colors',
                active ? 'text-primary-600' : 'text-gray-400'
              )}
            >
              <Icon className={cn('w-5 h-5', active && 'text-primary-600')} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
