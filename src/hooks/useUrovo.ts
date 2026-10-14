import { useEffect, useState } from 'react';
import {
  NativeEventEmitter,
  Platform,
  type EmitterSubscription,
} from 'react-native';
import {
  closeScanner,
  openScanner,
  UROVO_EVENTS,
  type ScanResult,
} from '../api';
import { OutputMode } from '../types';
import NativeUrovo from '../NativeUrovo';

export type UseUrovoProps = {
  onScan: (result: ScanResult) => void;
  outputMode?: OutputMode;
};

type UseUrovoResponse = {
  isScannerOpened: boolean;
};

export const useUrovo = ({
  onScan,
  outputMode = OutputMode.INTENT,
}: UseUrovoProps): UseUrovoResponse => {
  const [isScannerOpened, setIsScannerOpened] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const open = async () => {
      try {
        const isOpened = await openScanner(outputMode);

        if (isMounted) {
          setIsScannerOpened(!!isOpened);
        }
      } catch {
        if (isMounted) {
          setIsScannerOpened(false);
        }
      }
    };

    open().catch(() => undefined);

    return () => {
      isMounted = false;
      closeScanner()?.catch(() => undefined);
    };
  }, [outputMode]);

  useEffect(() => {
    let eventListener: EmitterSubscription | undefined;

    if (isScannerOpened && NativeUrovo) {
      const eventEmitter =
        Platform.OS === 'android'
          ? new NativeEventEmitter()
          : new NativeEventEmitter(NativeUrovo);

      eventListener = eventEmitter.addListener(
        UROVO_EVENTS.ON_SCAN,
        (scan: ScanResult) => {
          onScan(scan);
        }
      );
    }

    return () => {
      eventListener?.remove();
    };
  }, [isScannerOpened, onScan]);

  return { isScannerOpened };
};
