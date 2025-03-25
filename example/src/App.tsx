import { useEffect, useState } from 'react';
import {
  Button,
  NativeEventEmitter,
  Platform,
  StyleSheet,
  Text,
  View,
  type EmitterSubscription,
} from 'react-native';
import Urovo, {
  closeScanner,
  enableAllSymbologies,
  enableSymbologies,
  getParameters,
  openScanner,
  PROPERTY_ID,
  PropertyId,
  Symbology,
  UROVO_EVENTS,
  type ScanResult,
} from 'react-native-urovo';

// const useSymbologies = () => {
//   const enableSymbology = async (
//     symbologies: Symbology[] | boolean | undefined
//     enable: boolean
//   ) => {
//     try {
//       if (
//         typeof symbologies === 'boolean' ||
//         typeof symbologies === 'undefined'
//       ) {
//         await enableAllSymbologies(symbologies);
//       } else {
//         await enableSymbologies(symbologies);
//       }
//     } catch (error) {
//       console.error('enableSymbologies', error);
//     }
//   };

//   return { enableSymbology };
// };

export default function App() {
  const [scanResult, setScanResult] = useState<ScanResult>();

  const [isScannerOpened, setIsScannerOpened] = useState<boolean>(false);
  const [isQRSymbologyEnabled, setIsQRSymbologyEnabled] =
    useState<boolean>(true);

  const toggleQRSymbology = async () => {
    try {
      setIsQRSymbologyEnabled(!isQRSymbologyEnabled);
      await enableSymbologies([Symbology.QRCODE], isQRSymbologyEnabled);
    } catch (error) {
      console.error(error);
    }
  };

  const getParams = async () => {
    try {
      const params = await getParameters([
        PROPERTY_ID.AUSTRALIAN_POST_ENABLE,
        PROPERTY_ID.QRCODE_ENABLE,
      ]);

      console.log(params);
    } catch (error) {
      console.error(error);
    }
  };

  console.log('PropertyId', PropertyId);

  useEffect(() => {
    let isMounted = true;

    const open = async () => {
      const isOpened = await openScanner();

      await enableAllSymbologies(true);

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
      const eventEmitter =
        Platform.OS === 'android'
          ? new NativeEventEmitter()
          : new NativeEventEmitter(Urovo);

      eventListener = eventEmitter.addListener(
        UROVO_EVENTS.ON_SCAN,
        (scan: ScanResult) => {
          console.log(scan);
          setScanResult(scan);
        }
      );
    }

    return () => {
      eventListener?.remove();
    };
  }, [isScannerOpened]);

  // const {} = useUrovo({
  //   onScan: setScanResult,
  //   onOpen: () => {
  //     // only scan AZTEC codes
  //     // enableSymbology(true);
  //     // enableSymbology([Symbology.AZTEC]);
  //   },
  // });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Result: {scanResult?.value}</Text>
      <Text style={styles.text}>Type: {scanResult?.type}</Text>
      <Text style={styles.text}>Symbology: {scanResult?.symbology}</Text>
      <Button title={'Toggle QR symbology'} onPress={toggleQRSymbology} />
      <Button title={'Get params'} onPress={getParams} />
      <Text style={styles.text}>
        QR Symbology: {isQRSymbologyEnabled.toString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 20,
    textAlign: 'center',
  },
});
