import { useCallback, useEffect, useState } from 'react';
import { getOutputMode, switchOutputMode } from '../api';
import { OutputMode } from '../types';

type UseOutputModeResponse = [
  OutputMode | undefined,
  (mode: OutputMode) => Promise<void>,
];

export const useOutputMode = (): UseOutputModeResponse => {
  const [outputMode, setOutputMode] = useState<OutputMode>();

  const setMode = useCallback(async (mode: OutputMode) => {
    try {
      const isSwitched = await switchOutputMode(mode);
      if (isSwitched) {
        setOutputMode(mode);
      }
    } catch {
      // Keep the last confirmed mode when the native call fails.
    }
  }, []);

  const getMode = useCallback(async () => {
    const mode = await getOutputMode();
    setOutputMode(mode);
  }, []);

  useEffect(() => {
    getMode().catch(() => undefined);
  }, [getMode]);

  return [outputMode, setMode];
};
