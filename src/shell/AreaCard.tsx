import { NavLink } from '../ui/navigation';
import { shellMessages } from './messages';
import './shell.css';

export interface AreaCardProps {
  title: string;
  body: string;
  // Absent means the area has no route in this version: the card is shown disabled.
  href?: string;
}

export function AreaCard({ title, body, href }: AreaCardProps) {
  if (href) {
    return (
      <NavLink className="shell-card" href={href}>
        <strong>{title}</strong>
        <span>{body}</span>
      </NavLink>
    );
  }
  return (
    <div className="shell-card is-disabled" role="group" aria-label={title} aria-disabled="true">
      <strong>{title}</strong>
      <span>{body}</span>
      <em className="shell-tag">{shellMessages.soon}</em>
    </div>
  );
}
