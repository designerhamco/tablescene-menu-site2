import { Pencil } from "lucide-react";

/** Editing uses a small glyph; the containing control keeps its own hit area. */
export function EditIcon() {
  return <Pencil className="site-edit-icon" aria-hidden="true" />;
}
