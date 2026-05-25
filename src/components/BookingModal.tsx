import { Button, Input, Modal } from "animal-island-ui";
import { type FormEvent, useState } from "react";
import { useSiteContent } from "../hooks/useSiteContent";

type BookingModalProps = {
  initialPackage?: string;
  onClose: () => void;
};

export function BookingModal({ initialPackage, onClose }: BookingModalProps) {
  const { packages, siteConfig } = useSiteContent();
  const [selectedPkg, setSelectedPkg] = useState(initialPackage || "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) return;
    setSending(true);
    setError("");

    try {
      const r = await fetch("/api/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          packageName: selectedPkg,
          preferredDate: date,
          preferredTime: time,
          name: name.trim(),
          contact: contact.trim(),
          notes: notes.trim(),
        }),
      });

      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "提交失败");
      }

      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败，请稍后重试");
    } finally {
      setSending(false);
    }
  }

  const packageOptions = packages.map((p) => (
    <option key={p.name} value={p.name}>{p.name} — {p.price}</option>
  ));

  // ── Success state ──
  if (done) {
    return (
      <Modal open onClose={onClose} footer={null} typewriter={false}>
        <div className="booking-modal-success">
          <h2>✅ 预约已提交！</h2>
          <p>我们会尽快通过你留下的联系方式和你确认档期。</p>
          <p className="booking-success-hint">你也可以直接联系小红书：{siteConfig.xiaohongshuProfile}</p>
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <Button type="primary" onClick={onClose}>知道了</Button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Form state ──
  return (
    <Modal
      open
      onClose={onClose}
      title="预约拍摄"
      typewriter={false}
      maskClosable={false}
      footer={null}
    >
      <p style={{ margin: "0 0 16px", color: "var(--animal-text-color-secondary)", fontSize: 14 }}>
        留下信息，确认档期后锁定时间
      </p>

      <form onSubmit={handleSubmit}>
        <div className="booking-field">
          <label>感兴趣的套餐</label>
          <select value={selectedPkg} onChange={(e) => setSelectedPkg(e.target.value)}>
            <option value="">不限（都可以聊）</option>
            {packageOptions}
          </select>
        </div>

        <div className="booking-row">
          <div className="booking-field">
            <label>期望日期 <span className="booking-optional">可选</span></label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
          </div>
          <div className="booking-field">
            <label>期望时段 <span className="booking-optional">可选</span></label>
            <select value={time} onChange={(e) => setTime(e.target.value)}>
              <option value="">不限</option>
              <option value="上午">上午</option>
              <option value="下午">下午</option>
              <option value="全天">全天</option>
            </select>
          </div>
        </div>

        <div className="booking-field">
          <label>你的名字 <span className="booking-required">*</span></label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="怎么称呼你？"
            required
            shadow
          />
        </div>

        <div className="booking-field">
          <label>联系方式 <span className="booking-required">*</span></label>
          <Input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="手机号 / 微信 / 小红书 ID"
            required
            shadow
          />
        </div>

        <div className="booking-field">
          <label>想说的话 <span className="booking-optional">可选</span></label>
          <textarea
            className="booking-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="风格偏好、地点想法、任何想问的……"
            rows={3}
          />
        </div>

        {error ? <p className="booking-error">{error}</p> : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <Button type="default" onClick={onClose}>取消</Button>
          <Button type="primary" htmlType="submit" disabled={sending || !name.trim() || !contact.trim()}>
            {sending ? "提交中..." : "提交预约"}
          </Button>
        </div>

        <p className="booking-footer">
          提交即表示你同意拍摄边界说明。也可以直接去{" "}
          <a href={siteConfig.xiaohongshuProfile} target="_blank" rel="noreferrer">小红书私信</a>
        </p>
      </form>
    </Modal>
  );
}
