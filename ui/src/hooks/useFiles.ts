import { useState, useCallback, useEffect } from "react";
import { getFiles } from "../lib/api";
import type { MediaFile } from "../lib/api";

export function useFiles() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folder, setFolder] = useState<string | null>(null);

  const load = useCallback(async (f?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFiles(f);
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(folder ?? undefined);
  }, [folder, load]);

  return { files, loading, error, folder, setFolder, reload: load };
}
