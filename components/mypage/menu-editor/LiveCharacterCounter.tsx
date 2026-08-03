"use client";

import { useEffect, useState } from "react";

type LiveCharacterCounterProps = {
  fieldName: string;
  initialLength: number;
  maxLength: number;
};

function findField(fieldName: string) {
  const fields = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[name], textarea[name]"));

  return fields.find((field) => field.name === fieldName) ?? null;
}

export default function LiveCharacterCounter({ fieldName, initialLength, maxLength }: LiveCharacterCounterProps) {
  const [currentLength, setCurrentLength] = useState(initialLength);

  useEffect(() => {
    const field = findField(fieldName);
    if (!field) {
      return;
    }
    let frameId = 0;

    const updateLength = () => {
      setCurrentLength(field.value.length);
    };

    frameId = window.requestAnimationFrame(updateLength);
    field.addEventListener("input", updateLength);
    field.addEventListener("change", updateLength);

    const form = field.form;
    const handleReset = () => {
      frameId = window.requestAnimationFrame(updateLength);
    };
    form?.addEventListener("reset", handleReset);

    return () => {
      window.cancelAnimationFrame(frameId);
      field.removeEventListener("input", updateLength);
      field.removeEventListener("change", updateLength);
      form?.removeEventListener("reset", handleReset);
    };
  }, [fieldName, initialLength]);

  return (
    <span className={currentLength > maxLength ? "shrink-0 text-red-600" : "shrink-0"}>
      {currentLength} / {maxLength}
    </span>
  );
}
