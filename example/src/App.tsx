import { useState } from 'react';
import {
  Alert,
  Button,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import {
  OutputMode,
  PropertyID,
  useOutputMode,
  usePropertyID,
  useUrovo,
  type ScanResult,
} from 'react-native-urovo';

export default function App() {
  const [scanResult, setScanResult] = useState<ScanResult>();

  const [outputMode, setOutputMode] = useOutputMode();
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

  const changeOutputMode = async () => {
    try {
      // https://en.urovo.com/developer/android/device/scanner/configuration/PropertyID.html#SEND_GOOD_READ_BEEP_ENABLE
      Alert.alert(
        'Choose output mode',
        undefined,
        [
          {
            text: 'Intent (0)',
            onPress: () => {
              setOutputMode(OutputMode.INTENT);
            },
          },
          {
            text: 'Textbox (1)',
            onPress: () => {
              setOutputMode(OutputMode.TEXTBOX);
            },
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
    <KeyboardAvoidingView style={styles.container} behavior="padding" enabled>
      <ScrollView contentContainerStyle={styles.scrollViewContainer}>
        <Text style={styles.text}>Result: {scanResult?.value}</Text>
        <Text style={styles.text}>Type: {scanResult?.type}</Text>
        <Text style={styles.text}>Symbology: {scanResult?.symbology}</Text>
        <Button title={'Toggle QR'} onPress={toggleQRSymbology} />
        <Text style={styles.text}>QR enabled: {isEnabled?.toString()}</Text>

        <Button title={'Change beep value'} onPress={changeBeepValue} />
        <Text style={styles.text}>Beep value: {beepValue}</Text>

        <Button title={'Change output mode'} onPress={changeOutputMode} />
        <Text style={styles.text}>Output mode: {outputMode}</Text>
        <TextInput placeholder="Test textbox output mode" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // alignItems: 'center',
    justifyContent: 'center',
  },
  scrollViewContainer: {
    gap: 20,
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 20,
    textAlign: 'center',
  },
});
