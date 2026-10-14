import { messages } from '../messages';
import { tenantMessages as text } from '../tenants/messages';

// The loading and error states shared by the views of the panel; the data and empty states are the view's own.
export function QueryNotice({ state, retry }: { state: { kind: 'loading' | 'error' | 'data'; traceId?: string }; retry: () => void }) {
  if (state.kind === 'loading') return <p role="status">{text.loading}</p>;
  if (state.kind !== 'error') return null;
  return (
    <div role="alert" className="platform-error">
      <p>
        {messages.errors.unavailable}
        {state.traceId && ` (${messages.errors.trace}: ${state.traceId})`}
      </p>
      <button type="button" className="platform-outline" onClick={retry}>
        {text.retry}
      </button>
    </div>
  );
}
