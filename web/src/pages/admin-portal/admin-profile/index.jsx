import React, { useEffect, useState } from 'react';
import AdminSideBar from '../ui/sidebar-admin';
import AdminProfileSettings from '../ui/admin-profile-settings';

const AdminProfile = () => {
  const MIN_LOADING_MS = 900;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background theme-transition admin-skeleton">
        <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
          <AdminSideBar />
        </div>
        <div className="flex-1 min-w-0">
          <div className="p-6 md:p-8 space-y-8">
            <section className="rounded-3xl border border-primary/15 bg-surface-elevated skeleton-surface p-6 space-y-4">
              <div className="space-y-3">
                <div className="h-3 w-32 rounded bg-accent/10 animate-pulse"></div>
                <div className="h-7 w-64 rounded-lg bg-accent/20 animate-pulse"></div>
                <div className="h-4 w-80 rounded bg-accent/10 animate-pulse"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-primary/15">
                <div className="h-10 rounded-lg bg-accent/10 animate-pulse"></div>
                <div className="h-10 rounded-lg bg-accent/10 animate-pulse"></div>
              </div>
            </section>

            <section className="rounded-3xl border border-primary/15 bg-surface-elevated skeleton-surface p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="h-3 w-32 rounded bg-accent/10 animate-pulse"></div>
                    <div className="h-10 rounded-lg bg-accent/10 animate-pulse"></div>
                  </div>
                ))}
              </div>
              <div className="border-t border-primary/15 pt-4 flex flex-col sm:flex-row sm:justify-end gap-3">
                <div className="h-10 w-32 rounded-lg bg-accent/10 animate-pulse"></div>
                <div className="h-10 w-32 rounded-lg bg-accent/20 animate-pulse"></div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background theme-transition">
      <div className="flex-shrink-0" style={{ width: 'var(--sidebar-width, 20rem)' }}>
        <AdminSideBar />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <AdminProfileSettings />
      </div>
    </div>
  );
};

export default AdminProfile;
