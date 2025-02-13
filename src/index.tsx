import Urovo from './NativeUrovo';

export type ScanResult = {
  value: string;
  type: number;
};

export enum UROVO_EVENTS {
  ON_SCAN = 'ON_SCAN',
}

/**
 * Opens the Urovo scanner.
 * @returns A promise that resolves to `true` if the scanner was successfully opened, otherwise `false`.
 */
export function openScanner() {
  return Urovo?.openScanner();
}

export function closeScanner() {
  return Urovo?.closeScanner();
}

export default Urovo;
