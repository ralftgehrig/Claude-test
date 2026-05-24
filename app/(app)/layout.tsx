import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import { DisplayCurrencyProvider } from '@/lib/display-currency';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <DisplayCurrencyProvider>
      <div className="min-h-screen" style={{ background: '#F2F2F7' }}>
        <Sidebar />
        <main className="lg:ml-60 min-h-screen pb-nav-safe lg:pb-6">
          <div className="max-w-3xl mx-auto px-4 py-5 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
    </DisplayCurrencyProvider>
  );
}
