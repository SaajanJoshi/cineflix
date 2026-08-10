import { useCallback, useEffect, useState } from 'react';
import {
  clearProgress,
  isInMyList,
  readContinueWatching,
  readMyList,
  readPreviewPreference,
  subscribeLibrary,
  toggleMyList,
  writePreviewPreference,
} from '../lib/library.js';

export function useLibrary() {
  const [myList, setMyList] = useState(() => readMyList());
  const [continueWatching, setContinueWatching] = useState(() => readContinueWatching());
  const [previewsEnabled, setPreviewsEnabledState] = useState(() => readPreviewPreference());

  const refresh = useCallback(() => {
    setMyList(readMyList());
    setContinueWatching(readContinueWatching());
    setPreviewsEnabledState(readPreviewPreference());
  }, []);

  useEffect(() => subscribeLibrary(refresh), [refresh]);

  const toggleSaved = useCallback((media) => {
    const saved = toggleMyList(media);
    refresh();
    return saved;
  }, [refresh]);

  const setPreviewsEnabled = useCallback((enabled) => {
    writePreviewPreference(enabled);
    refresh();
  }, [refresh]);

  const removeFromContinueWatching = useCallback((entry) => {
    if (!entry?.media) return;
    clearProgress(entry.media, entry.season, entry.episode);
    refresh();
  }, [refresh]);

  return {
    myList,
    continueWatching,
    previewsEnabled,
    setPreviewsEnabled,
    toggleSaved,
    removeFromContinueWatching,
    isSaved: isInMyList,
    refresh,
  };
}
