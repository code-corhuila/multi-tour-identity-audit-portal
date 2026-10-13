import type { ReactNode } from 'react';

export interface PageHeaderProps {
  eyebrow: string;
  title: string;
  // The header's action, e.g. the "Crear operador" button of Summary and Operators (spec 007 D-03).
  action?: ReactNode;
}

export function PageHeader({ eyebrow, title, action }: PageHeaderProps) {
  return (
    <header className="mt-page-header">
      <div className="mt-page-header-main">
        <p className="mt-page-header-eyebrow">{eyebrow}</p>
        <h1 className="mt-page-header-title">{title}</h1>
      </div>
      {action}
    </header>
  );
}
