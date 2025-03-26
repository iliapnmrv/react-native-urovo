# react-native-urovo

React native bindings for urovo scanners

- Works on both old `Legacy Native Modules` and new `Turbo Native Modules` architectures
- Uses latest urovo [SDK](https://github.com/urovosamples/SDK_ReleaseforAndroid)
- Supports latest React Native version `v0.77+`

## Compatibility

This library tries to support as many RN versions as possible. For now the goal is to support the same versions as RN itself, you can learn more [here](https://github.com/reactwg/react-native-releases/blob/main/docs/support.md)

| RN-urovo version | RN version | Supports New Architecture |
| ---------------- | ---------- | ------------------------- |
| 1.0.0            | 0.78       | yes                       |
| 1.0.0            | 0.77       | yes                       |
| 1.0.0            | 0.76       | yes                       |
| 1.0.0            | 0.75       | no                        |
| 1.0.0            | 0.74       | no                        |

versions <= 0.73 are not supported

## Installation

```sh
npm install react-native-urovo
```

## Usage

There are 2 options to get started with

### 1. Using `useUrovo` Hook

This hook initializes the urovo module for you. It handles clean up and created eventListener. You only have to pass `onScan` method

```ts
import { useUrovo, type ScanResult } from 'react-native-urovo';

const [scanResult, setScanResult] = useState<ScanResult>();

useUrovo({ onScan: setScanResult });
```

### 2. Using `openScanner` and `closeScanner` methods

First, you have to open/init the scanner

```ts
import { closeScanner, openScanner } from 'react-native-urovo';

useEffect(() => {
  openScanner();

  return () => {
    // make sure to close scanner to avoid unexpected behaviour
    closeScanner();
  };
}, []);
```

Then, add listener on module, `UROVO_EVENTS.ON_SCAN` event type

```ts
import Urovo, { type ScanResult, UROVO_EVENTS } from 'react-native-urovo';

useEffect(() => {
  let eventListener: EmitterSubscription | undefined;
  if (Urovo) {
    // used only for type safety
    const eventEmitter = new NativeEventEmitter(Urovo);
    eventListener = eventEmitter.addListener(
      UROVO_EVENTS.ON_SCAN,
      (scan: ScanResult) => {}
    );
  }

  return () => {
    eventListener?.remove();
  };
}, []);
```

## Methods

### openScanner

Opens scanner instance

### closeScanner

Closes scanner

### getParameters

Returns key-value pair of requested parameters

> It is low level API that comes from Urovo itself, for most cases I recommend using the [usePropertyID](#usepropertyid) hook

```ts
import { PropertyID } from 'react-native-urovo';

const parameters = await getParameters([
  PropertyID.QRCODE_ENABLE,
  PropertyID.SEND_GOOD_READ_BEEP_ENABLE,
]);

const isQREnabled = parameters?.[PropertyID.QRCODE_ENABLE];
```

Response

```json
{
  "2832": 1, // or 0
  "6": 0 // this parameter supports values 0 : None, 1 : Short, 2 : Sharp
}
```

### setParameter

Sets parameter value.

> It is low level API that comes from Urovo itself, for most cases I recommend using the [usePropertyID](#usepropertyid) hook

```ts
import { setParameter, PropertyID } from 'react-native-urovo';

await setParameter({ [PropertyID.QRCODE_ENABLE]: 1 });
```

### resetScannerParameters

Resets to factory default settings for all barcode symbology types.

```ts
import { resetScannerParameters } from 'react-native-urovo';

await resetScannerParameters();
```

#### What are Parameters/PropertyID?

Urovo scanners have a set of parameters that you can set for better UX. A complete list of parameters you can find [in the docs](https://en.urovo.com/developer/constant-values.html#android.device.scanner.configuration.PropertyID.AUSTRALIAN_POST_ENABLE)

Unfortunately Urovo does not come with a great descriptions, so you mostly have to figure in out yourself 🤷‍♂️

Also Urovo scanners come with built-in scanner app and settings. (You can find them in Settings -> ). You can test any parameter there and them find it in the docs.

## hooks

### usePropertyID

Sets and reads PropertyID

```ts
import { PropertyID, usePropertyID } from 'react-native-urovo';

const [isQREnabled, setIsQREnabled] = usePropertyID(PropertyID.QRCODE_ENABLE);
```

## Types

| key       | value     | description                                                                                                                                                       |
| --------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| value     | string    | `intent.getStringExtra (BARCODE_STRING_TAG)`                                                                                                                      |
| symbology | Symbology | [Symbology key](#symbology)                                                                                                                                       |
| type      | number    | Symbology value. You can learn more [here](https://en.urovo.com/developer/constant-values.html#android.device.scanner.configuration.Constants.Symbology.MATRIX25) |

```json
{
  "value": "barcode",
  "symbology": "QRCODE",
  "type": 31
}
```

### Symbology

Symbology is an Enum that contains all barcode types that are supported by current version on urovo scanners

```ts
enum Symbology {
  QRCODE = 'QRCODE',
  // ...
}
```

You can learn more about symbology [on official website](https://en.urovo.com/developer/android/device/scanner/configuration/Symbology.html)

## Contributing

If you have any feature requests, feel free ask for it

## License

MIT
