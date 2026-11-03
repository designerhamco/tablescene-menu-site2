"use client";

import { useEffect, useState } from "react";
import { detectTerminalDevice, type TerminalDeviceInfo } from "@/lib/terminal-device-info";

type DeviceNavigator = Navigator & { userAgentData?: { getHighEntropyValues: (keys: string[]) => Promise<{ model?: string; platformVersion?: string }> } };
export function useCurrentDeviceInfo(initial?: TerminalDeviceInfo) {
  const [detected, setDetected] = useState<TerminalDeviceInfo>(initial ?? { kind: "기기", os: "확인 중", model: "", browser: "" });
  const [model, setModel] = useState("");
  const [os, setOs] = useState("");
  useEffect(() => {
    let active = true;
    const update = (hints = {}) => { if (active) setDetected(detectTerminalDevice(navigator.userAgent, { maxTouchPoints: navigator.maxTouchPoints, ...hints })); };
    update();
    (navigator as DeviceNavigator).userAgentData?.getHighEntropyValues(["model", "platformVersion"]).then(update).catch(() => {});
    return () => { active = false; };
  }, []);
  return { device: { ...detected, os: os.trim().slice(0, 100) || detected.os, model: model.trim().slice(0, 100) || detected.model }, os, setOs, model, setModel };
}
