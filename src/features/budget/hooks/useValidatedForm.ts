import { useCallback, useMemo, useState } from 'react';
import { hasErrors, type FieldErrors } from '../utils/budgetValidation';

type Touched<T> = Partial<Record<keyof T, boolean>>;

/**
 * Form values plus "touched" tracking: a field's error shows only after the
 * person edits it or tries to submit, so empty forms never open in red.
 * `initial` and `validate` must be stable (module constants / useCallback).
 */
export const useValidatedForm = <T extends Record<string, string>>(
  initial: T,
  validate: (values: T) => FieldErrors<T>
) => {
  const [values, setValues] = useState<T>(initial);
  const [touched, setTouched] = useState<Touched<T>>({});
  const errors = useMemo(() => validate(values), [validate, values]);

  const setField = useCallback((name: keyof T, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const errorFor = (name: keyof T): string => (touched[name] ? errors[name] ?? '' : '');

  /** Reveals every error; returns true when the form is valid. */
  const submit = (): boolean => {
    const all = Object.keys(values).reduce<Touched<T>>((acc, key) => ({ ...acc, [key]: true }), {});
    setTouched(all);
    return !hasErrors(errors as Record<string, string | undefined>);
  };

  const reset = useCallback(() => {
    setValues(initial);
    setTouched({});
  }, [initial]);

  return { values, setField, errorFor, submit, reset };
};
