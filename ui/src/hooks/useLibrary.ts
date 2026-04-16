import { useState, useCallback, useEffect } from "react";
import { getLibrary, indexPaths, removeFolder } from "../lib/api";
import type { LibraryFolder, IndexResponse } from "../lib/api";

export function useLibrary() {
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [indexing, setIndexing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getLibrary();
      setFolders(data);
    } catch {
      // API not ready yet, silently ignore
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addPaths = useCallback(
    async (paths: string[]): Promise<IndexResponse | null> => {
      setIndexing(true);
      setToast("Indexing videos...");
      try {
        const result = await indexPaths(paths);
        await refresh();
        const msg =
          result.skipped > 0
            ? `Indexed ${result.indexed} videos (${result.skipped} files skipped)`
            : `Indexed ${result.indexed} videos`;
        setToast(msg);
        setTimeout(() => setToast(null), 4000);
        return result;
      } catch (err) {
        setToast(
          `Indexing failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
        setTimeout(() => setToast(null), 4000);
        return null;
      } finally {
        setIndexing(false);
      }
    },
    [refresh]
  );

  const remove = useCallback(
    async (path: string) => {
      await removeFolder(path);
      await refresh();
    },
    [refresh]
  );

  const totalVideos = folders.reduce((sum, f) => sum + f.video_count, 0);

  return { folders, totalVideos, indexing, toast, addPaths, remove, refresh };
}
