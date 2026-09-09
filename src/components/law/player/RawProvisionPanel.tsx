import { useMemo } from "react";
import { Link } from "react-router";
import { provisionHref, splitLawRefTokens } from "../../../lib/law-provisions";
import "../../../styles/law-index.css";

/**
 * 原文对照面板（P4·T3 法条标引）：
 * 逐页 OCR 原文里的法条引用自动高亮为链接（/law/provisions?law=X&article=Y），
 * 点击直达该法条的课时清单。分词与跳转规则单源于 lib/law-provisions。
 */
export function RawProvisionPanel({ raw }: { raw: string[] }) {
  const tokens = useMemo(() => splitLawRefTokens(raw.join("\n")), [raw]);

  return (
    <details className="law-player__rawpanel" open>
      <summary>书中原文（逐页 OCR，与知识点一一对应）</summary>
      <pre>
        {tokens.map((token, index) =>
          token.type === "text" ? (
            token.text
          ) : (
            <Link
              key={index}
              className="law-prov-ref"
              to={provisionHref(token.ref.law, token.ref.article)}
              title="查看这条法条被哪些课引用"
            >
              {token.text}
            </Link>
          ),
        )}
      </pre>
    </details>
  );
}
