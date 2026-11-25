"use client";
import { createContext, useContext } from "react";
import type { MenuDecorations } from "@/lib/menu-decorations";

export const MenuDecorationContext = createContext<{ decorations: MenuDecorations; album: boolean }>({ decorations: {}, album: false });
export const useMenuDecorations = () => useContext(MenuDecorationContext);
