import { memo } from "react";
import { ArrowLeft } from "lucide-react";
import { PrefetchLink } from "./PrefetchLink";

type Props = {
  to: string;
  label: string;
};

export const DetailBackLink = memo(function DetailBackLink({ to, label }: Props) {
  return (
    <PrefetchLink
      to={to}
      className="detail-back-link"
    >
      <ArrowLeft size={16} aria-hidden="true" /> {label}
    </PrefetchLink>
  );
});
