import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type { Symbology } from 'react-native-urovo';

export interface Spec extends TurboModule {
  openScanner: () => Promise<boolean>;
  closeScanner: () => Promise<boolean>;
  enableAllSymbologies: (enable: boolean) => Promise<Symbology[]>;
  enableSymbologies: (
    symbologies: Symbology[],
    enable: boolean
  ) => Promise<Symbology[]>;

  getParameters: (ids: number[]) => Promise<void>;

  addListener(eventName: string): void;
  removeListeners(count: number): void;

  getConstants(): {
    PropertyId: number[];
  };
}

export default TurboModuleRegistry.get<Spec>('Urovo');
