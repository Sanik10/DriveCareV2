// path: apps/frontend/app/dashboard/invoices/new/page.tsx
import { Suspense } from 'react';
import NewInvoiceClient from './_client/NewInvoice.client';

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-6 py-8">
          <div className="space-y-4">
            <div className="h-24 rounded-3xl bg-muted/40 animate-pulse" />
            <div className="h-32 rounded-3xl bg-muted/40 animate-pulse" />
            <div className="h-20 rounded-3xl bg-muted/40 animate-pulse" />
          </div>
        </div>
      }
    >
      <NewInvoiceClient />
    </Suspense>
  );
}
