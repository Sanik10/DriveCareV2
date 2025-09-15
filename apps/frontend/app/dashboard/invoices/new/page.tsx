// path: apps/frontend/app/dashboard/invoices/new/page.tsx
import NewInvoiceClient from './_client/NewInvoice.client';

export default function NewInvoicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1">
      <div className="fixed inset-0 bg-gradient-surface -z-10" />
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-primary opacity-5 rounded-full blur-3xl -z-10" />
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -z-10" />
      <main className="container mx-auto px-6 py-6">
        <NewInvoiceClient />
      </main>
    </div>
  );
}
