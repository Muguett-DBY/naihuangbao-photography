import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getPlan, setPlanTier, type LawPlan, type PlanTier } from "../../lib/law-plan";

const TIERS: { id: PlanTier; label: string; desc: string }[] = [
  { id: "relaxed", label: "🛋️ 轻松", desc: "每天少学点，也能在考前稳稳过完" },
  { id: "standard", label: "🎯 标准", desc: "每天这个量，考前刚好全部学完一遍" },
  { id: "intense", label: "🔥 冲刺", desc: "提前 20 天收尾，留时间二轮背诵" },
];

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

/** 考前计划卡：倒计时 + 每日步数 + 三档节奏 + 学完预估 */
export function LawPlanCard() {
  const [tier, setTier] = useState<PlanTier>(getPlan().tier);
  const plan: LawPlan = useMemo(() => getPlan(), [tier]);
  const finished = plan.remainingSteps <= 0;

  function choose(next: PlanTier) {
    setTier(next);
    setPlanTier(next);
  }

  return (
    <motion.section
      className="law-plan-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      aria-label="考研倒计时与每日计划"
    >
      <div className="law-plan-card__countdown">
        <span className="law-plan-card__label">📅 距离 2027 法硕考研初试</span>
        {plan.daysLeft > 0 ? (
          <>
            <strong>{plan.daysLeft}</strong>
            <span className="law-plan-card__unit">天</span>
          </>
        ) : (
          <strong>就是今天！</strong>
        )}
        <span className="law-plan-card__date">{formatDate("2026-12-26")} · 就这几天，稳住</span>
      </div>

      <div className="law-plan-card__body">
        <div className="law-plan-card__progress">
          <div className="law-plan-card__progress-head">
            <b>总进度</b>
            <span>
              {plan.doneSteps} / {plan.totalSteps} 步
              {finished ? " 🎉 已经全部学完啦！" : ` · 还剩 ${plan.remainingSteps} 步`}
            </span>
          </div>
          <div className="law-plan-card__bar">
            <span style={{ width: `${(plan.doneSteps / plan.totalSteps) * 100}%` }} />
          </div>
          {plan.finishEstimate && !finished ? (
            <p className="law-plan-card__estimate">
              ✍️ 按现在的节奏，预计 <b>{formatDate(plan.finishEstimate)}</b> 学完全部
              {plan.finishEstimate <= "2026-12-26" ? "，赶在考试前！" : "，可以切「冲刺」档提前收尾"}
            </p>
          ) : null}
        </div>

        <div className="law-plan-card__today">
          <b>今日已学 {plan.todayDone} 步</b>
          <span>
            建议 {plan.dailyTarget} 步 ≈ {Math.max(1, Math.round((plan.dailyTarget * 20) / 60))} 分钟，
            就能保证考前全部学完
          </span>
          <div className="law-plan-card__today-bar">
            <span style={{ width: `${plan.todayPercent}%` }} />
          </div>
          <em>{plan.todayPercent >= 100 ? "今日达标 ✓ 太棒了" : `距离今日达标还差 ${Math.max(0, plan.dailyTarget - plan.todayDone)} 步`}</em>
        </div>
      </div>

      <div className="law-plan-card__tiers" role="radiogroup" aria-label="学习节奏">
        {TIERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={tier === item.id}
            className={`law-plan-card__tier ${tier === item.id ? "is-active" : ""}`}
            onClick={() => choose(item.id)}
          >
            <b>{item.label}</b>
            <small>{item.desc}</small>
          </button>
        ))}
      </div>
    </motion.section>
  );
}
