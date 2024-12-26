# react-native-urovo

React native bindings for urovo scanners

- Works on both old `Legacy Native Modules` and new `Turbo Native Modules` architecture
- Uses latest urovo [SDK](https://github.com/urovosamples/SDK_ReleaseforAndroid)
- Supports latest React Native version `v0.76+`

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
