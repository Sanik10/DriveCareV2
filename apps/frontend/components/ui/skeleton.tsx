// path: apps/frontend/components/ui/skeleton.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  radius?: "sm" | "md" | "lg" | "xl" | "full";
}

const radiusMap: Record<NonNullable<SkeletonProps["radius"]>, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  // По умолчанию используем строгое скругление "md" (8px), а не огромное "xl"
  ({ className, radius = "md", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-pulse bg-muted", // Системный цвет вместо хардкода gray-200
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
