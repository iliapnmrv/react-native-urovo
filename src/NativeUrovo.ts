import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type {
  OutputMode,
  PropertyID,
  PropertyIdValue,
  Symbology,
} from './types';

export interface Spec extends TurboModule {
  openScanner: (mode?: OutputMode) => Promise<boolean>;
  closeScanner: () => Promise<boolean>;
  switchOutputMode: (mode: OutputMode) => Promise<boolean>;
  getOutputMode: () => Promise<OutputMode>;
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
