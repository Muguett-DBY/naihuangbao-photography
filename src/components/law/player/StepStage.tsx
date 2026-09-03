import type { LawStep } from "../../../types/law";
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

export function StepStage({ step, accent, accentSoft, onDone }: StepProps) {
  const props = { step, accent, accentSoft, onDone };
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
