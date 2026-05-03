"use client";
import { useState, useEffect, useCallback } from "react";
import type { Post } from "@/types";

export function usePosts(artist?: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const url = artist
        ? `/api/posts?artist=${encodeURIComponent(artist)}`
        : "/api/posts";
      const res = await fetch(url);
      const data = await res.json();
      // API returns either a raw array or { status, data }
      if (Array.isArray(data)) setPosts(data);
      else if (data.status === "success") setPosts(data.data);
    } finally {
      setLoading(false);
    }
  }, [artist]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, loading, refresh: fetchPosts };
}
