import { useEffect } from "react";

const SCRIPT_ID_PREFIX = "json-ld-";

type JsonLdOptions = {
  id: string;
  data: Record<string, unknown> | Record<string, unknown>[];
  removeOnUnmount?: boolean;
};

function setJsonLdScript(id: string, data: Record<string, unknown> | Record<string, unknown>[]) {
  const scriptId = `${SCRIPT_ID_PREFIX}${id}`;
  let script = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.text = JSON.stringify(data);
}

function removeJsonLdScript(id: string) {
  const scriptId = `${SCRIPT_ID_PREFIX}${id}`;
  const script = document.getElementById(scriptId);
  if (script) script.remove();
}

export function useJsonLd({ id, data, removeOnUnmount = true }: JsonLdOptions) {
  useEffect(() => {
    setJsonLdScript(id, data);
    return () => {
      if (removeOnUnmount) removeJsonLdScript(id);
    };
  }, [id, JSON.stringify(data), removeOnUnmount]);
}
