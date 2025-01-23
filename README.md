# react-native-urovo

React native bindings for urovo scanners

- Works on both old `Legacy Native Modules` and new `Turbo Native Modules` architectures
- Uses latest urovo [SDK](https://github.com/urovosamples/SDK_ReleaseforAndroid)
- Supports latest React Native version `v0.77+`

## Compatibility

This library tries to support as many RN versions as possible. For now the goal is to support the same versions as RN itself, you can learn more [here](https://github.com/reactwg/react-native-releases/blob/main/docs/support.md)


| RN-urovo version | RN version | Supports New Architecture |
|------------|------------------|---------------------------|
| 1.0.0  | 0.77 | yes |
| 1.0.0  | 0.76 | yes |
| 1.0.0  | 0.75 | no  |

versions < 0.74 TBA

## Installation

```sh
npm install react-native-urovo
```

## Usage

First, you have to open/init the scanner

```ts
import { closeScanner, openScanner } from 'react-native-urovo';

useEffect(() => {
  openScanner();

  return () => {
    closeScanner();
  };
}, []);
```

Then, add listener on module, `UROVO_EVENTS.ON_SCAN` event type

```ts
import Urovo, { type ScanResult, UROVO_EVENTS } from 'react-native-urovo';

useEffect(() => {
  let eventListener: EmitterSubscription | undefined;
  if (Urovo) { // used only for type safety
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

## Types

```ts
type ScanResult = {
  value: string;
  type: number;
};
```

## Contributing

If you have any feature requests, feel free ask for it

## License

MIT
