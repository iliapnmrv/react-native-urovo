import { useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text } from 'react-native';
import {
  PropertyID,
  usePropertyID,
  useUrovo,
  type ScanResult,
} from 'react-native-urovo';

export default function App() {
  const [scanResult, setScanResult] = useState<ScanResult>();

  const [isEnabled, setIsEnabled] = usePropertyID(PropertyID.QRCODE_ENABLE);

  const [beepValue, setBeepValue] = usePropertyID(
    PropertyID.SEND_GOOD_READ_BEEP_ENABLE
  );

  const toggleQRSymbology = async () => {
    try {
      const newValue = Number(!isEnabled);
      await setIsEnabled(newValue);
    } catch (error) {
      console.error(error);
    }
  };

  const changeBeepValue = async () => {
    try {
      // https://en.urovo.com/developer/android/device/scanner/configuration/PropertyID.html#SEND_GOOD_READ_BEEP_ENABLE
      Alert.alert(
        'Choose beep value',
        undefined,
        [
          {
            text: 'None (0)',
            onPress: () => setBeepValue(0),
          },
          {
            text: 'Short (1)',
            onPress: () => setBeepValue(1),
          },
          {
            text: 'Sharp (2)',
            onPress: () => setBeepValue(2),
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error(error);
    }
  };

  const {} = useUrovo({
    onScan: setScanResult,
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.text}>Result: {scanResult?.value}</Text>
      <Text style={styles.text}>Type: {scanResult?.type}</Text>
      <Text style={styles.text}>Symbology: {scanResult?.symbology}</Text>
      <Button title={'Toggle QR'} onPress={toggleQRSymbology} />
      <Text style={styles.text}>QR enabled: {isEnabled?.toString()}</Text>

      <Button title={'Change beep value'} onPress={changeBeepValue} />
      <Text style={styles.text}>Beep value: {beepValue}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  text: {
    fontSize: 20,
    textAlign: 'center',
  },
});
