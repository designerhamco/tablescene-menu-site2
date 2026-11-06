import type { ComponentPropsWithoutRef, ReactNode } from "react";

type CheckboxFieldProps = Omit<ComponentPropsWithoutRef<"input">, "type" | "className" | "style"> & {
  label: ReactNode;
  description?: ReactNode;
};

/** Native submission and fieldset semantics with the common selection geometry. */
export function CheckboxField({ label, description, ...props }: CheckboxFieldProps) {
  return (
    <label className="site-checkbox-field">
      <input {...props} type="checkbox" />
      <span className="site-stack-copy">
        <span className="type-label">{label}</span>
        {description ? <span className="type-caption site-copy-muted">{description}</span> : null}
      </span>
    </label>
  );
}

export function CheckboxFieldGroup({ children, label, columns = 2 }: {
  children: ReactNode;
  label: string;
  columns?: 2 | 3;
}) {
  return <div className="site-checkbox-grid" data-columns={columns} role="group" aria-label={label}>{children}</div>;
}
