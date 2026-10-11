import { createRoot } from 'react-dom/client';
import type { MountProps } from './contract';

export function Placeholder() {
  return <p>Identity and audit portal</p>;
}

// The container calls this with its own client and session; the portal never creates either (Annex H).
export function mount(element: HTMLElement, _props: MountProps): () => void {
  const root = createRoot(element);
  root.render(<Placeholder />);
  return () => root.unmount();
}
