"use client";
import {List,Map} from "lucide-react";
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from "./select";
import type {Ref} from "react";

export function ViewStyleSelect({value,onValueChange,ref,label="보기 유형"}:{value:string;onValueChange:(value:string)=>void;ref?:Ref<HTMLButtonElement>;label?:string}){
 return <Select value={value} onValueChange={onValueChange}><SelectTrigger ref={ref} aria-label={label}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="map"><Map aria-hidden="true"/>배치도형</SelectItem><SelectItem value="list"><List aria-hidden="true"/>리스트형</SelectItem></SelectContent></Select>;
}
