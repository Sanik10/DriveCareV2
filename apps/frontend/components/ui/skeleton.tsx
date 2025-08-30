// path: apps/frontend/components/ui/skeleton.tsx
import { Skeleton as MSkeleton, type SkeletonProps as MSkeletonProps } from '@mantine/core'
export type SkeletonProps = MSkeletonProps
export function Skeleton(props: SkeletonProps) { return <MSkeleton radius="md" {...props} /> }
