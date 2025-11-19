import React from 'react';
import Header from 'components/ui/Header';

const GetTheApp = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16 max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold mb-2">Get the Serene AI Patient App</h1>
        <p className="text-text-secondary mb-8">
          For patients, consultations run in our mobile app. Install or open the app to continue.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <a
            href="sereneai://open"
            className="inline-flex items-center justify-center rounded-lg bg-primary text-white py-3 px-4 shadow-brand hover:opacity-95"
          >
            Open in App
          </a>
          <a
            href="#"
            className="inline-flex items-center justify-center rounded-lg bg-card border border-border py-3 px-4 text-foreground hover:shadow-brand"
          >
            I’ll install it later
          </a>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-brand">
          <h2 className="font-medium mb-3">Download</h2>
          <div className="flex items-center gap-3">
            <a
              href="#" // App Store link
              className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 hover:shadow-brand"
            >
              App Store
            </a>
            <a
              href="#" // Play Store link
              className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 hover:shadow-brand"
            >
              Google Play
            </a>
          </div>
          <p className="text-xs text-text-secondary mt-4">
            Tip: If you received a consultation link, opening it on your phone will launch the app automatically.
          </p>
        </div>
      </main>
    </div>
  );
};

export default GetTheApp;

