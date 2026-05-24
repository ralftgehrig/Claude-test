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
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <main className="lg:ml-60 pb-20 lg:pb-0 min-h-screen">
          <div className="max-w-6xl mx-auto px-4 py-6 lg:px-8">
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
    </DisplayCurrencyProvider>
  );
}
