import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type {
  PropertyID,
  PropertyIdValue,
  Symbology,
} from 'react-native-urovo';

export interface Spec extends TurboModule {
  openScanner: () => Promise<boolean>;
  closeScanner: () => Promise<boolean>;
  enableAllSymbologies: (enable: boolean) => Promise<Symbology[]>;
  enableSymbologies: (
    symbologies: Symbology[],
    enable: boolean
  ) => Promise<Symbology[]>;

  getParameters: (
    ids: number[]
  ) => Promise<Record<PropertyID, PropertyIdValue>>;
  setParameter: (param: Object) => Promise<boolean>;
  resetScannerParameters: () => Promise<boolean>;

  addListener(eventName: string): void;
  removeListeners(count: number): void;

  readonly getConstants: () => {};
}

export default TurboModuleRegistry.get<Spec>('Urovo');
