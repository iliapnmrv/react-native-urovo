import { useEffect, useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  type EmitterSubscription,
  NativeEventEmitter,
} from 'react-native';
import Urovo, {
  closeScanner,
  openScanner,
  type ScanResult,
} from 'react-native-urovo';

export default function App() {
  const [scanResult, setScanResult] = useState<ScanResult>();
  const [isScannerOpened, setIsScannerOpened] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

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
    if (isScannerOpened && Urovo) {
      const eventEmitter = new NativeEventEmitter(Urovo);
      eventListener = eventEmitter.addListener(
        'ON_SCAN',
        (scan: ScanResult) => {
          setScanResult(scan);
        }
      );
    }

    return () => {
      eventListener?.remove();
    };
  }, [isScannerOpened]);

  return (
    <View style={styles.container}>
      <Text>Result: {scanResult?.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
