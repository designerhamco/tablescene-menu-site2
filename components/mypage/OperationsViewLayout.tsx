"use client";
import {createContext,useContext,useState,type ReactNode} from "react";
import {SectionHeader} from "@/app/components/ui/section-header";
import {ViewStyleSelect} from "@/app/components/ui/view-style-select";

const ViewContext=createContext<{view:string;setView:(value:string)=>void}|null>(null);
export const useOperationsView=()=>useContext(ViewContext);
/** Keeps the view selector beside the title while preserving server-rendered feature navigation. */
export default function OperationsViewLayout({title,selectable=true,help,children}:{title:string;selectable?:boolean;help?:ReactNode;children:ReactNode}){
 const [view,setView]=useState("map");
 return <ViewContext.Provider value={{view,setView}}><div className="site-stack-content"><SectionHeader title={title} help={help} actions={selectable?<ViewStyleSelect value={view} onValueChange={setView}/>:undefined}/>{children}</div></ViewContext.Provider>;
}
