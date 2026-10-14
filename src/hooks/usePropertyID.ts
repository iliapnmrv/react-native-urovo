import { useCallback, useEffect, useState } from 'react';
import { getParameters, setParameter } from '../api';
import { PropertyID, type PropertyIdValue } from '../types';

type UsePropertyIDResponse = [
  PropertyIdValue | undefined,
  (value: PropertyIdValue) => Promise<void>,
];

export const usePropertyID = (property: PropertyID): UsePropertyIDResponse => {
  const [propertyValue, setPropertyValue] = useState<PropertyIdValue>();

  const setProperty = useCallback(
    async (value: PropertyIdValue) => {
      const isUpdated = await setParameter({ [property]: value });
      if (isUpdated) {
        setPropertyValue(value);
      }
    },
    [property]
  );

  const getProperty = useCallback(async () => {
    const params = await getParameters([property]);
    setPropertyValue(params?.[property]);
  }, [property]);

  useEffect(() => {
    getProperty().catch(() => undefined);
  }, [getProperty]);

  return [propertyValue, setProperty];
};
