import { useCallback } from "react";
import Sidebar from "./components/Sidebar";
import ResultsList from "./components/ResultsList";
import VideoPlayer from "./components/VideoPlayer";
import Toast from "./components/Toast";
import { useSearch } from "./hooks/useSearch";
import { useLibrary } from "./hooks/useLibrary";
import { usePlayer } from "./hooks/usePlayer";
import type { SearchResult, Timestamp } from "./lib/api";

function App() {
  const { results, query, loading, error, search, recentSearches } =
    useSearch();
  const { folders, totalVideos, indexing, toast, addPaths } = useLibrary();
  const {
    videoRef,
    currentResult,
    currentTime,
    duration,
    playing,
    selectResult,
    seekTo,
    togglePlay,
    skip,
    seekToPosition,
    onTimeUpdate,
    onLoadedMetadata,
    onEnded,
  } = usePlayer();

  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      selectResult(result);
    },
    [selectResult]
  );

  const handleTimestampClick = useCallback(
    (result: SearchResult, ts: Timestamp) => {
      if (currentResult?.file !== result.file) {
        selectResult(result);
        // seekTo will happen after video loads via onLoadedMetadata
      }
      seekTo(ts);
    },
    [currentResult, selectResult, seekTo]
  );

  return (
    <div className="h-full flex bg-bg-base">
      <Sidebar
        onSearch={search}
        searchLoading={loading}
        folders={folders}
        totalVideos={totalVideos}
        onDrop={addPaths}
        indexing={indexing}
        recentSearches={recentSearches}
      />

      <ResultsList
        results={results}
        query={query}
        loading={loading}
        error={error}
        selectedFile={currentResult ? `${currentResult.video_dir}/${currentResult.file}` : null}
        onSelect={handleSelectResult}
        onTimestampClick={handleTimestampClick}
      />

      <VideoPlayer
        videoRef={videoRef}
        result={currentResult}
        currentTime={currentTime}
        duration={duration}
        playing={playing}
        onTogglePlay={togglePlay}
        onSkip={skip}
        onSeekTo={seekTo}
        onSeekToPosition={seekToPosition}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
      />

      <Toast message={toast} />
    </div>
  );
}

export default App;
