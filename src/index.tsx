import NativeModule from './NativeUrovo';
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
  return NativeModule?.openScanner();
}

export function closeScanner() {
  return NativeModule?.closeScanner();
}

export function enableAllSymbologies(enable: boolean = true) {
  return NativeModule?.enableAllSymbologies(enable);
}

export function getParameters(ids: number[]) {
  return NativeModule?.getParameters(ids);
}

export function enableSymbologies(
  symbologies: Symbology[],
  enable: boolean = true
) {
  return NativeModule?.enableSymbologies(symbologies, enable);
}

export const { PropertyId } = NativeModule?.getConstants() ?? {};

const Urovo = NativeModule;

export * from './types/PropertyId';
export * from './types/Symbology';

export default Urovo;
