// path: apps/frontend/components/ui/confirm-dialog.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  description?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  variant?: "destructive" | "default" | "outline";
  onConfirm: () => void | Promise<void>;
  icon?: React.ReactNode;
  footerExtra?: React.ReactNode;
  className?: string;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Подтвердите действие",
  description = "Вы уверены, что хотите продолжить?",
  confirmText = "Подтвердить",
  cancelText = "Отмена",
  loading = false,
  variant = "destructive",
  onConfirm,
  icon,
  footerExtra,
  className,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent glow className={cn("max-w-xl", className)}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center",
              variant === "destructive" ? "bg-destructive/20 text-destructive" : "bg-secondary/20 text-secondary"
            )}>
              {icon ?? <AlertTriangle className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              {description ? <DialogDescription className="mt-1">{description}</DialogDescription> : null}
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
            <span className="mr-2">Горячие клавиши:</span>
            <Kbd>Esc</Kbd>
            <span className="ml-1">— Закрыть</span>
          </div>
          {footerExtra}
          <DialogClose asChild>
            <Button variant="outline" disabled={loading}>
              {cancelText}
            </Button>
          </DialogClose>
          <Button variant={variant} onClick={onConfirm} disabled={loading}>
            {loading ? "Выполняется..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
