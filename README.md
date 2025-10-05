# react-native-urovo

React native bindings for urovo scanners

- Works on both old `Legacy Native Modules` and new `Turbo Native Modules` architectures
- Uses latest urovo [SDK](https://github.com/urovosamples/SDK_ReleaseforAndroid)
- Supports latest React Native version `v0.81+`

## Compatibility

This library tries to support as many RN versions as possible. For now the goal is to support the same versions as RN itself, you can learn more [here](https://github.com/reactwg/react-native-releases/blob/main/docs/support.md)

| RN-urovo version | RN version | Supports New Architecture |
| ---------------- | ---------- | ------------------------- |
| 1.0.0            | 0.76+      | yes                       |
| 1.0.0            | 0.75       | no                        |
| 1.0.0            | 0.74       | no                        |

versions <= 0.73 are not supported

## Installation

```sh
npm install react-native-urovo
```

## Usage

There are 2 options to get started with

### 1. `useUrovo` Hook

Initializes the Urovo scanner for you and wires up an event listener for scan results.

**Parameters**:

- `onScan` (required) — callback invoked on every scan with:

```ts
type ScanResult = {
  value: string; // decoded barcode text
  type: number; // raw symbology type code from device
  symbology: Symbology; // typed symbology enum
};
```

- `outputMode` (optional) — how the device delivers results. Defaults to OutputMode.INTENT.

**Returns**:

`isScannerOpened` — `boolean` after the scanner is successfully opened.

```ts
import { useUrovo, type ScanResult } from 'react-native-urovo';

const [scanResult, setScanResult] = useState<ScanResult>();

useUrovo({ onScan: setScanResult });
```

### 2. `openScanner` and `closeScanner` methods

First, open or initialize the scanner:

```ts
import { closeScanner, openScanner } from 'react-native-urovo';

useEffect(() => {
  openScanner();

  return () => {
    // Be sure to close scanner to avoid unexpected behaviour
    closeScanner();
  };
}, []);
```

Next, add a listener for the `UROVO_EVENTS.ON_SCAN` event to handle scan results:

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

I recommend wrapping every method in `trycatch`. Learn more in [Troubleshooting](#troubleshooting)

### openScanner(mode?)

Opens the Urovo scanner instance.

**Parameters**:

mode?: OutputMode — if omitted, `OutputMode.Intent` mode is used.

**Returns**:

Promise<boolean> — true if the scanner was opened successfully.

```ts
// these  calls are equal
await openScanner();
await openScanner(OutputMode.Intent);

const ok = await openScanner(OutputMode.TextBox);
```

### closeScanner

Closes the scanner

### getOutputMode

Gets the current scanner output mode.

**Returns**: Promise<OutputMode | undefined>

Example

```ts
const mode = await getOutputMode();
```

### switchOutputMode(mode)

Switches the scanner output mode at runtime.

**Parameters**:

mode: OutputMode

**Returns**:

Promise — true if the mode is applied.

```ts
await switchOutputMode(OutputMode.Intent);
```

### getParameters

Retrieves a key-value pair object for the requested parameters

> This is a low-level API provided by Urovo. In most cases, it is recommended to use the [usePropertyID](#usepropertyid) hook

#### Example

```ts
import { PropertyID } from 'react-native-urovo';

const parameters = await getParameters([
  PropertyID.QRCODE_ENABLE,
  PropertyID.SEND_GOOD_READ_BEEP_ENABLE,
]);

const isQREnabled = parameters?.[PropertyID.QRCODE_ENABLE]; // 0 - disabled or 1 - enabled
```

Response

```json
{
  "2832": 1, // or 0
  "6": 0 // this parameter supports: 0 - None, 1 - Short, 2 - Sharp
}
```

### setParameter

Sets the value for a specified parameter

> This is a low-level API provided by Urovo. In most cases, it is recommended to use the [usePropertyID](#usepropertyid) hook

```ts
import { setParameter, PropertyID } from 'react-native-urovo';

await setParameter({ [PropertyID.QRCODE_ENABLE]: 1 });
```

### resetScannerParameters

Resets all barcode settings to their factory defaults.

```ts
import { resetScannerParameters } from 'react-native-urovo';

await resetScannerParameters();
```

#### What are Parameters/PropertyID?

Urovo scanners have a set of parameters that you can set for better UX. A complete list of parameters you can find [in the docs](https://en.urovo.com/developer/constant-values.html#android.device.scanner.configuration.PropertyID.AUSTRALIAN_POST_ENABLE)

Unfortunately Urovo does not come with a great descriptions, so you mostly have to figure it out yourself 🤷‍♂️

Also Urovo scanners come with built-in scanner app and settings. (You can find them in Settings -> Enterprise featured settings -> Scanner settings). You can test any parameter there and them find it in the docs.

## hooks

### usePropertyID

The `usePropertyID` hook allows you to read and set parameter values (PropertyID) easily

```ts
import { PropertyID, usePropertyID } from 'react-native-urovo';

const [isQREnabled, setIsQREnabled] = usePropertyID(PropertyID.QRCODE_ENABLE);
```

### useOutputMode

Hook to read and change `OutputMode`

```ts
import { useOutputMode } from 'react-native-urovo';

const [outputMode, setMode] = useOutputMode();
```

## Types

### ScanResult

| key       | value     | description                                                                                                                                                                                           |
| --------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| value     | string    | The barcode value obtained using `intent.getStringExtra (BARCODE_STRING_TAG)`                                                                                                                         |
| symbology | Symbology | The barcode type. See the [Symbology](#symbology) section for more details                                                                                                                            |
| type      | number    | A numeric representation of the barcode type. More details can be found [here](https://en.urovo.com/developer/constant-values.html#android.device.scanner.configuration.Constants.Symbology.MATRIX25) |

```json
{
  "value": "barcode",
  "symbology": "QRCODE",
  "type": 31
}
```

### Symbology

The Symbology enum contains all supported barcode types for the current Urovo scanner version

```ts
enum Symbology {
  QRCODE = 'QRCODE',
  // ...
}
```

For additional details on supported symbologies, please refer to the [official Urovo documentation](https://en.urovo.com/developer/android/device/scanner/configuration/Symbology.html)

### OutputMode

Controls how scan data is delivered:

> Set the output mode of the barcode reader (either send output to text box or as Android intent). TextBox Mode allows the captured data to be sent to the text box in focus. Intent mode allows the captured data to be sent as an implicit Intent

`OutputMode.Intent` — data is sent via Android implicit Intent (good for background handling in JS).

`OutputMode.TextBox` — “keyboard wedge”: types into the focused text input.

> **Important!**. When using `OutputMode.TextBox`, there are 2 concerns to keep in mind

1. Urovo does not focus to the input
2. Urovo does not clear the input

For better UX use [`TextInput.showSoftInputOnFocus`](https://reactnative.dev/docs/textinput#showsoftinputonfocus) parameter

```ts
export enum OutputMode {
  INTENT = 0,
  TEXTBOX = 1,
}
```

## Troubleshooting

### Stub (Android only)

`Stub` error means that device does not support Urovo methods. If you're using Sentry, make sure to wrap every method in `trycatch`.

```ts
// before
await setParameter({ [PropertyID.QRCODE_ENABLE]: 1 });

// after
try {
  await setParameter({ [PropertyID.QRCODE_ENABLE]: 1 });
} catch (e) {
  // you'll get stub error if current device does not support Urovo methods
  console.error(e);
}
```

> Should you just ignore this error?

> In most cases yes, you should. But sometimes you might want to handle in someho. For example show notification to user

## Contributing

If you have any feature requests or suggestions, feel free to open an issue or submit a pull request.

## License

MIT
