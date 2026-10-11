import { useEffect, useRef, useState } from 'react';
import type { ApiClient } from '../contract';
import { createCustomerAccount, type CreateCustomerRequest } from '../data/security';
import { mapRegisterError, type RegisterFailure } from './registerErrors';

export function useRegisterCustomer(identifier: string, apiClient: ApiClient) {
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<RegisterFailure | null>(null);
  const current = useRef<AbortController | null>(null);
  // The key follows the data (RN-SEC-PT-16): kept while the fields do not change after a failure, new otherwise.
  // The passwords are not part of the comparison because they are cleared after each send.
  const attempt = useRef<{ data: string; key: string } | null>(null);

  useEffect(() => () => current.current?.abort(), []);

  // Resolves true when the account exists.
  async function submit(body: CreateCustomerRequest): Promise<boolean> {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    const data = JSON.stringify([body.firstName, body.lastName, body.email, body.phone]);
    if (attempt.current?.data !== data) attempt.current = { data, key: crypto.randomUUID() };
    setSending(true);
    setFailure(null);
    try {
      await createCustomerAccount(apiClient, identifier, body, attempt.current.key, controller.signal);
      if (controller.signal.aborted) return false;
      attempt.current = null;
      return true;
    } catch (error) {
      if (!controller.signal.aborted) setFailure(mapRegisterError(error));
      return false;
    } finally {
      if (!controller.signal.aborted) setSending(false);
    }
  }

  return { sending, failure, submit };
}
