// path: apps/frontend/components/ui/skeleton.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  radius?: "sm" | "md" | "lg" | "xl" | "full";
}

/**
 * Локальный Skeleton без зависимостей от Mantine.
 * Устраняет ошибку "MantineProvider was not found..." и подходит для shadcn/Tailwind.
 */
const radiusMap: Record<NonNullable<SkeletonProps["radius"]>, string> = {
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  xl: "rounded-2xl",
  full: "rounded-full",
};

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, radius = "xl", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-pulse bg-gray-200/40 dark:bg-gray-700/30",
          radiusMap[radius],
          className
        )}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";

export { Skeleton };
export default Skeleton;
