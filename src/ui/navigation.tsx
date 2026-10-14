import { createContext, useContext, type AnchorHTMLAttributes, type MouseEvent } from 'react';

// SPA navigation owned by the container (`MountProps.navigate`). Absent means an older container: links stay anchors.
export const NavigateContext = createContext<((path: string) => void) | undefined>(undefined);

export const useNavigate = () => useContext(NavigateContext);

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

// An anchor that asks the container to navigate. The href stays for accessibility, middle click and modified clicks,
// which are left to the browser.
export function NavLink({ href, onClick, children, ...rest }: LinkProps) {
  const navigate = useNavigate();
  const click = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
    if (!navigate || event.defaultPrevented || modified || rest.target === '_blank') return;
    event.preventDefault();
    navigate(href);
  };
  return (
    <a href={href} onClick={click} {...rest}>
      {children}
    </a>
  );
}
