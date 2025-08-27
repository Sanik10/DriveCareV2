// path: apps/frontend/components/ui/toast.tsx
'use client';
import { Toaster } from 'sonner';

export function ToastProvider() {
  return <Toaster position="top-right" toastOptions={{ duration: 4000 }} />;
}
