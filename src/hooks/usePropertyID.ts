import { useCallback, useEffect, useState } from 'react';
import {
  getParameters,
  PropertyID,
  setParameter,
  type PropertyIdValue,
} from 'react-native-urovo';

type UsePropertyIDResponse = [
  PropertyIdValue | undefined,
  (value: PropertyIdValue) => Promise<void>,
];

export const usePropertyID = (property: PropertyID): UsePropertyIDResponse => {
  const [propertyValue, setPropertyValue] = useState<PropertyIdValue>();

  const setProperty = useCallback(
    async (value: PropertyIdValue) => {
      await setParameter({ [property]: value });
      setPropertyValue(value);
    },
    [property]
  );

  const getProperty = useCallback(async () => {
    const params = await getParameters([property]);
    setPropertyValue(params?.[property]);
  }, [property]);

  useEffect(() => {
    getProperty();
  }, [getProperty]);

  return [propertyValue, setProperty];
};
