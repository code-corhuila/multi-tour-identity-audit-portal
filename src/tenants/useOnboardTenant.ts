import { useEffect, useRef, useState } from 'react';
import type { ApiClient } from '../contract';
import { readOnboarding, startOnboarding, type Saga, type StartOnboardTenantRequest } from '../data/onboarding';
import { mapOnboardError, type OnboardFailure } from './onboardErrors';

// A saga that is still RUNNING after this many reads is left to the person (manual refresh).
export const MAX_POLLS = 10;

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => (clearTimeout(timer), resolve()), { once: true });
  });

export function useOnboardTenant(apiClient: ApiClient, pollMs: number) {
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<OnboardFailure | null>(null);
  const [saga, setSaga] = useState<Saga | null>(null);
  const current = useRef<AbortController | null>(null);
  // The key follows the data (RN-IDA-PT-04): kept while the fields do not change after a failure, new otherwise.
  // The password is not part of the comparison because it is cleared after each send (RN-IDA-PT-02).
  const attempt = useRef<{ data: string; key: string } | null>(null);

  useEffect(() => () => current.current?.abort(), []);

  function begin() {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setSending(true);
    setFailure(null);
    return controller;
  }

  async function follow(first: Saga, controller: AbortController) {
    if (controller.signal.aborted) return;
    let latest = first;
    setSaga(latest);
    for (let polls = 0; latest.status === 'RUNNING' && polls < MAX_POLLS; polls++) {
      await wait(pollMs, controller.signal);
      if (controller.signal.aborted) return;
      latest = await readOnboarding(apiClient, latest.id, controller.signal);
      if (controller.signal.aborted) return;
      setSaga(latest);
    }
    if (latest.status === 'COMPLETED') attempt.current = null;
  }

  async function run(work: (controller: AbortController) => Promise<void>) {
    const controller = begin();
    try {
      await work(controller);
    } catch (error) {
      if (!controller.signal.aborted) setFailure(mapOnboardError(error));
    } finally {
      if (!controller.signal.aborted) setSending(false);
    }
  }

  const submit = (body: StartOnboardTenantRequest) =>
    run(async (controller) => {
      setSaga(null);
      const { administrator, ...rest } = body;
      const data = JSON.stringify([rest, administrator.fullName, administrator.email]);
      if (attempt.current?.data !== data) attempt.current = { data, key: crypto.randomUUID() };
      await follow(await startOnboarding(apiClient, body, attempt.current.key, controller.signal), controller);
    });

  // Manual refresh of a saga that was still running when the polling ended.
  const refresh = () =>
    run(async (controller) => {
      if (saga) await follow(await readOnboarding(apiClient, saga.id, controller.signal), controller);
    });

  return { sending, failure, saga, submit, refresh };
}
