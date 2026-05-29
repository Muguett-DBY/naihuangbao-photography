import { memo } from "react";
import { PageTransition } from "./PageTransition";
import { DetailBackLink } from "./DetailBackLink";

type Props = {
  message: string;
  backTo: string;
  backLabel: string;
};

export const DetailNotFound = memo(function DetailNotFound({ message, backTo, backLabel }: Props) {
  return (
    <PageTransition>
      <div style={{ textAlign: "center", padding: 120 }}>
        <h2>{message}</h2>
        <DetailBackLink to={backTo} label={backLabel} />
      </div>
    </PageTransition>
  );
});
