// path: apps/frontend/app/dashboard/invoices/page.tsx
import { Suspense } from 'react';
import List from './_client/List.client';

export default function InvoicesPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-6 py-8">
          <div className="space-y-3">
            <div className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
            <div className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
            <div className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
          </div>
        </div>
      }
    >
      <List />
    </Suspense>
  );
}
