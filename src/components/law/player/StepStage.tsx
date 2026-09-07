import { useCallback, useEffect, useRef } from "react";
import type { LawStep } from "../../../types/law";
import { playLawSound } from "../../../lib/law-sound";
import { DefinitionStep } from "./steps/DefinitionStep";
import { ListStep } from "./steps/ListStep";
import { CompareStep } from "./steps/CompareStep";
import { MnemonicStep } from "./steps/MnemonicStep";
import { TimelineStep } from "./steps/TimelineStep";
import { ConditionStep } from "./steps/ConditionStep";
import { ExceptionStep } from "./steps/ExceptionStep";
import { FlowStep } from "./steps/FlowStep";
import { PlainStep } from "./steps/PlainStep";
import type { StepProps } from "./steps/types";

/** 进入即自动完成的步骤（普通段落型）不算"亲手完成"，不响音效 */
const USER_DONE_MIN_MS = 700;

export function StepStage({ step, accent, accentSoft, onDone }: StepProps) {
  const mountedAt = useRef(Date.now());
  const soundedFor = useRef<string | null>(null);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, [step.id]);

  // 步骤完成音效：挂载后很快被标完成的步骤（自动完成型）静音，只给用户亲手点出的完成配音
  const handleDone = useCallback(() => {
    if (soundedFor.current !== step.id && Date.now() - mountedAt.current >= USER_DONE_MIN_MS) {
      soundedFor.current = step.id;
      playLawSound("step");
    }
    onDone();
  }, [onDone, step.id]);

  const props = { step, accent, accentSoft, onDone: handleDone };
  switch (step.kind) {
    case "definition":
      return <DefinitionStep {...props} />;
    case "list":
      return <ListStep {...props} />;
    case "compare":
      return <CompareStep {...props} />;
    case "mnemonic":
      return <MnemonicStep {...props} />;
    case "timeline":
      return <TimelineStep {...props} />;
    case "condition":
      return <ConditionStep {...props} />;
    case "exception":
      return <ExceptionStep {...props} />;
    case "flow":
      return <FlowStep {...props} />;
    default:
      return <PlainStep {...props} />;
  }
}
