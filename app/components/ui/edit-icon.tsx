import { Pencil } from "@/app/components/ui/site-icon";

/** Editing uses a small glyph; the control follows the glyph without a padded frame. */
export function EditIcon() {
  return <Pencil className="site-edit-icon" aria-hidden="true" />;
}
