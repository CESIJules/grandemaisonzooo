"use client";

import { memo } from "react";
import styles from "./Skeleton.module.css";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  count?: number;
  gap?: string;
}

/**
 * Reusable skeleton loader with shimmer animation.
 * Matches the dark aesthetic (#050505 background).
 */
export const Skeleton = memo(function Skeleton({
  width = "100%",
  height = "1rem",
  borderRadius = "4px",
  className,
}: Omit<SkeletonProps, "count" | "gap">) {
  return (
    <span
      className={`${styles.skeleton} ${className ?? ""}`}
      style={{
        width,
        height,
        borderRadius,
        display: "block",
      }}
      aria-hidden="true"
    />
  );
});

export const SkeletonGroup = memo(function SkeletonGroup({
  count = 3,
  height = "1rem",
  gap = "0.5rem",
  borderRadius = "4px",
  width = "100%",
}: SkeletonProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          height={height}
          borderRadius={borderRadius}
          width={i === count - 1 ? "60%" : width} // last line shorter
        />
      ))}
    </div>
  );
});

export const ArtistCardSkeleton = memo(function ArtistCardSkeleton() {
  return (
    <div className={styles.artistCard} aria-hidden="true">
      <div className={styles.artistImage} />
      <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Skeleton height="1.1rem" width="70%" />
        <Skeleton height="0.8rem" width="50%" />
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
          <Skeleton height="1.5rem" width="1.5rem" borderRadius="50%" />
          <Skeleton height="1.5rem" width="1.5rem" borderRadius="50%" />
        </div>
      </div>
    </div>
  );
});

export const TimelineItemSkeleton = memo(function TimelineItemSkeleton() {
  return (
    <div className={styles.timelineItem} aria-hidden="true">
      <Skeleton height="160px" borderRadius="8px" />
      <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Skeleton height="0.75rem" width="40%" />
        <Skeleton height="1rem" width="80%" />
        <Skeleton height="0.75rem" width="60%" />
        <Skeleton height="0.7rem" width="30%" />
      </div>
    </div>
  );
});

export default Skeleton;
