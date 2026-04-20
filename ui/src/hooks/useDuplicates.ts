import { useState, useCallback } from "react";
import { getDuplicates } from "../lib/api";
import type { DuplicateGroup } from "../lib/api";

export function useDuplicates() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.95);

  const scan = useCallback(async (t?: number) => {
    const th = t ?? threshold;
    if (t !== undefined) setThreshold(th);
    setLoading(true);
    setError(null);
    try {
      const data = await getDuplicates(th);
      setGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [threshold]);

  return { groups, loading, error, threshold, scan };
}
