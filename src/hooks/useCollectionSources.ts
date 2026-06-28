import { useCallback, useEffect, useState } from "react";
import {
  deleteCollectionSource,
  fetchCollectionSources,
  fetchCollections,
  type CollectionSourceInfo,
} from "../lib/api";
import { useAppStore } from "../store/useAppStore";

export function useCollectionSources(collectionName: string | null) {
  const [sources, setSources] = useState<CollectionSourceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setCollections = useAppStore((state) => state.setCollections);

  const refresh = useCallback(async () => {
    if (!collectionName) {
      setSources([]);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const next = await fetchCollectionSources(collectionName);
      setSources(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sources");
    } finally {
      setLoading(false);
    }
  }, [collectionName]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const removeSource = useCallback(
    async (sourcePath: string) => {
      if (!collectionName) return 0;
      const removed = await deleteCollectionSource(collectionName, sourcePath);
      const collections = await fetchCollections();
      setCollections(collections);
      await refresh();
      return removed;
    },
    [collectionName, refresh, setCollections],
  );

  return { sources, loading, error, refresh, removeSource };
}
