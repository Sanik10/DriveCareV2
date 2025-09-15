// path: apps/frontend/app/dashboard/invoices/[id]/page.tsx
import { Suspense } from 'react';
import Details from './_client/Details.client';

export default function InvoiceDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-6 py-8">
          <div className="space-y-3">
            <div className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
            <div className="h-40 rounded-2xl bg-muted/40 animate-pulse" />
            <div className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
          </div>
        </div>
      }
    >
      <Details />
    </Suspense>
  );
}
