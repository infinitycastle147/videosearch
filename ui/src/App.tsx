import { useState, useCallback, useEffect } from "react";
import Titlebar from "./components/Titlebar";
import Sidebar from "./components/Sidebar";
import type { View } from "./components/Sidebar";
import Topbar from "./components/Topbar";
import StatusBar from "./components/StatusBar";
import TweaksPanel from "./components/TweaksPanel";
import Onboarding from "./components/Onboarding";
import SearchView from "./components/SearchView";
import PlayerView from "./components/PlayerView";
import DuplicatesView from "./components/DuplicatesView";
import LibraryView from "./components/LibraryView";
import { useSearch } from "./hooks/useSearch";
import { useLibrary } from "./hooks/useLibrary";
import { usePlayer } from "./hooks/usePlayer";
import { useDuplicates } from "./hooks/useDuplicates";
import { useFiles } from "./hooks/useFiles";
import type { SearchResult } from "./lib/api";

export default function App() {
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem("vs.onboarded") === "1");
  const [view, setView] = useState<View>("search");
  const [resultMode, setResultMode] = useState<"grid" | "list">("grid");
  const [theme, setTheme] = useState(() => localStorage.getItem("vs.theme") || "dark");
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [duplicatesScanned, setDuplicatesScanned] = useState(false);

  const { results, query, loading: searchLoading, error: searchError, search, recentSearches } = useSearch();
  const [queryInput, setQueryInput] = useState("");
  const { folders, totalVideos, indexing, addPaths } = useLibrary();
  const { videoRef, currentResult, currentTime, duration, playing, selectResult, seekTo: _seekTo, togglePlay, skip, seekToPosition, onTimeUpdate, onLoadedMetadata, onEnded } = usePlayer();
  const { groups: dupGroups, loading: dupLoading, error: dupError, scan: scanDups } = useDuplicates();
  const { files, loading: filesLoading, error: filesError, folder: filesFolder, setFolder: setFilesFolder } = useFiles();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("vs.theme", theme);
  }, [theme]);

  const handleSearch = useCallback((q: string) => {
    setQueryInput(q);
    search(q);
  }, [search]);

  const handleSelectResult = useCallback((r: SearchResult) => {
    selectResult(r);
  }, [selectResult]);

  const handleBack = useCallback(() => {
    selectResult(null as unknown as SearchResult);
  }, [selectResult]);

  const handleScanDups = useCallback(async () => {
    await scanDups();
    setDuplicatesScanned(true);
  }, [scanDups]);

  const handleAddFolder = useCallback(async (paths: string[]) => {
    return addPaths(paths);
  }, [addPaths]);

  const handleAddFolderFromSidebar = useCallback(async () => {
    // Attempt Tauri dialog, fall back gracefully
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true, multiple: true });
      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        await addPaths(paths);
      }
    } catch {
      // Not in Tauri context or dialog not available
      console.warn("File dialog not available");
    }
  }, [addPaths]);

  const finishOnboarding = useCallback(() => {
    localStorage.setItem("vs.onboarded", "1");
    setOnboarded(true);
    setView("search");
  }, []);

  const showPlayer = !!currentResult;

  return (
    <div className="app">
      <Titlebar />
      <div className="body">
        {onboarded && (
          <Sidebar
            view={view}
            setView={v => { setView(v); }}
            totalVideos={totalVideos}
            duplicatesCount={dupGroups.length}
            folders={folders}
            onAddFolder={handleAddFolderFromSidebar}
            onFolderClick={path => { setView("library"); setFilesFolder(path); }}
            activeFolder={filesFolder}
          />
        )}
        <div className="main">
          {onboarded && (
            <Topbar
              query={queryInput}
              setQuery={setQueryInput}
              onSearch={handleSearch}
              resultMode={resultMode}
              setResultMode={setResultMode}
              onTweaks={() => setTweaksOpen(o => !o)}
              showBack={showPlayer}
              onBack={handleBack}
            />
          )}
          <div className="content">
            {!onboarded ? (
              <Onboarding onFinish={finishOnboarding} onAddFolder={handleAddFolder} />
            ) : showPlayer ? (
              <PlayerView
                result={currentResult}
                videoRef={videoRef}
                currentTime={currentTime}
                duration={duration}
                playing={playing}
                onTogglePlay={togglePlay}
                onSkip={skip}
                onSeekToPosition={seekToPosition}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onEnded={onEnded}
                query={query}
                onBack={handleBack}
              />
            ) : view === "library" ? (
              <LibraryView
                files={files}
                loading={filesLoading}
                error={filesError}
                folder={filesFolder}
                setFolder={setFilesFolder}
                folders={folders}
                onOpenResult={handleSelectResult}
              />
            ) : view === "duplicates" ? (
              <DuplicatesView
                groups={dupGroups}
                loading={dupLoading}
                error={dupError}
                scanned={duplicatesScanned}
                onScan={handleScanDups}
              />
            ) : (
              <SearchView
                query={queryInput}
                setQuery={setQueryInput}
                onSearch={handleSearch}
                results={results}
                loading={searchLoading}
                error={searchError}
                resultMode={resultMode}
                onOpenResult={handleSelectResult}
                recentSearches={recentSearches}
                hasLibrary={folders.length > 0}
              />
            )}
          </div>
          {onboarded && <StatusBar indexing={indexing} totalVideos={totalVideos} />}
        </div>
      </div>
      <TweaksPanel open={tweaksOpen} onClose={() => setTweaksOpen(false)} theme={theme} setTheme={setTheme} />
    </div>
  );
}
