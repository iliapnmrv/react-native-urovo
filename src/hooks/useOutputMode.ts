import { useCallback, useEffect, useState } from 'react';
import {
  getOutputMode,
  OutputMode,
  switchOutputMode,
} from 'react-native-urovo';

type UsePropertyIDResponse = [
  OutputMode | undefined,
  (mode: OutputMode) => Promise<void>,
];

export const useOutputMode = (): UsePropertyIDResponse => {
  const [outputMode, setOutputMode] = useState<OutputMode>();

  const setMode = useCallback(async (mode: OutputMode) => {
    try {
      await switchOutputMode(mode);
      setOutputMode(mode);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const getMode = useCallback(async () => {
    const mode = await getOutputMode();
    setOutputMode(mode);
  }, []);

  useEffect(() => {
    getMode();
  }, [getMode]);

  return [outputMode, setMode];
};
