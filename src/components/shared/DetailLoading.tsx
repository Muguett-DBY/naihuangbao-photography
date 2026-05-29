import { memo } from "react";
import { PageTransition } from "./PageTransition";

type Props = {
  label?: string;
};

export const DetailLoading = memo(function DetailLoading({ label = "Loading..." }: Props) {
  return (
    <PageTransition>
      <div style={{ textAlign: "center", padding: 120 }}>{label}</div>
    </PageTransition>
  );
});
