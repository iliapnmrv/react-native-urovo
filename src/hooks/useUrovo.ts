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
} from 'react-native-urovo';
import NativeUrovo from '../NativeUrovo';

export type UseUrovoProps = {
  onScan: (result: ScanResult) => void;
};

type UseUrovoResponse = {
  isScannerOpened: boolean;
};

export const useUrovo = ({ onScan }: UseUrovoProps): UseUrovoResponse => {
  const [isScannerOpened, setIsScannerOpened] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    console.log('opening');

    const open = async () => {
      const isOpened = await openScanner();

      if (isMounted) {
        setIsScannerOpened(!!isOpened);
      }
    };

    open();

    return () => {
      isMounted = false;
      closeScanner();
    };
  }, []);

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
