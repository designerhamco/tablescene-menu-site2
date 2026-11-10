import type {ReactNode} from "react";

/** A major work area uses the registered section title, with optional tools beside it. */
export function SectionHeader({title,id,help,actions}:{title:ReactNode;id?:string;help?:ReactNode;actions?:ReactNode}){
 return <header className="site-content-heading-row" data-layout="toolbar"><div className="site-action-row" data-wrap="nowrap"><h2 id={id} className="type-section-title">{title}</h2>{help}</div>{actions?<div className="site-field-stack">{actions}</div>:null}</header>;
}
