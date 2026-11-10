/** Room labels share the saved emoji, without including it in the editable name. */
export function RoomLabel({name,emoji}:{name:string;emoji?:string}){return <>{emoji?<span aria-hidden="true">{emoji}</span>:null}{name}</>;}
