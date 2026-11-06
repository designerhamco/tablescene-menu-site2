import type {ComponentProps} from "react";
import {cn} from "./utils";

/** Persistent field feedback shared by native forms and react-hook-form fields. */
export function FieldMessage({className,...props}:ComponentProps<"p">){
  return <p data-slot="form-message" className={cn("text-destructive type-footnote",className)} {...props}/>;
}
