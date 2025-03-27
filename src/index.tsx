import NativeUrovo from './NativeUrovo';
import type { PropertyID } from './types/PropertyId';
import type { Symbology } from './types/Symbology';

export type ScanResult = {
  value: string;
  type: number;
  symbology: Symbology;
};

export enum UROVO_EVENTS {
  ON_SCAN = 'ON_SCAN',
}

/**
 * Opens the Urovo scanner.
 * @returns A promise that resolves to `true` if the scanner was successfully opened| otherwise `false`.
 */
export function openScanner() {
  return NativeUrovo?.openScanner();
}

export function closeScanner() {
  return NativeUrovo?.closeScanner();
}

export function enableAllSymbologies(enable: boolean = true) {
  return NativeUrovo?.enableAllSymbologies(enable);
}

export function getParameters(ids: PropertyID[]) {
  return NativeUrovo?.getParameters(ids);
}

export function resetScannerParameters() {
  return NativeUrovo?.resetScannerParameters();
}

export type PropertyIdValue = number | string;

export type SetParameterArg = Partial<Record<PropertyID, PropertyIdValue>>;
// export type SetParameterArg = number;

export function setParameter(params: SetParameterArg) {
  return NativeUrovo?.setParameter(params);
}

export function enableSymbologies(
  symbologies: Symbology[],
  enable: boolean = true
) {
  return NativeUrovo?.enableSymbologies(symbologies, enable);
}

// export const {} = NativeUrovo?.getConstants() ?? {};

const Urovo = NativeUrovo;

export * from './types';
export * from './hooks';

export default Urovo;
