import type { SiteContent } from "../../types/content";

export const defaultSiteContent: SiteContent = {
  siteConfig: {
    brandName: "Naihuangbao Photography",
    city: "Nanjing",
    domain: "shoot.custard.top",
    tagline: "Nanjing Portrait & Couple Photography",
    description: "Soft, film-like natural portrait photography for everyday memories, Jiangnan-style shoots, couple anniversaries, and relaxed city walks.",
    contactStatus: "DM on Xiaohongshu",
    contactHint: "Contact me via Xiaohongshu DM to discuss styles and availability.",
    xiaohongshuProfile: "https://www.xiaohongshu.com/user/profile/60f5b14b000000002002fa9f",
  },
  packages: [
    {
      name: "Indoor Portrait",
      price: "50/h",
      duration: "Min. 2 hours",
      summary: "Best for studio shoots, café visits, light themes, or weather-independent sessions.",
      includes: ["Single or duo same price", "Style consultation", "Min. 2 hours charged"],
    },
    {
      name: "Outdoor Session",
      price: "60/h",
      duration: "Min. 2 hours",
      summary: "Best for Nanjing streets, parks, Jiangnan-style routes, and natural light everyday shots.",
      includes: ["Single or duo same price", "Route suggestions", "Full posing guidance"],
    },
    {
      name: "Instant Add-on",
      price: "9.9/print",
      duration: "Fuji mini 11",
      summary: "For a physical instant print on shoot day — a tangible memento of your session.",
      includes: ["Per-print pricing", "Can be added to any package", "Confirm quantity on-site"],
    },
  ],
  serviceAddOns: {
    equipment: ["Canon 200D II", "Canon 95ixus", "iPhone 17 Pro", "iPhone 6 SP"],
    instantCamera: { camera: "Fuji mini 11", price: "9.9/print" },
  },
  servicePolicies: [
    { title: "Min. 2 hours", detail: "Under 2 hours is charged as 2 hours. Late by 15min counts from arrival." },
    { title: "Deposit ¥50", detail: "Non-refundable for no-shows. Refundable except for non-severe weather. Date change allowed." },
    { title: "Referral -¥15", detail: "Friend referrals or returning clients get ¥15 off, subject to booking confirmation." },
    { title: "Transport & Tickets", detail: "Round-trip transport reimbursed. Special locations may require taxi/entry fees." },
  ],
  faqs: [
    { question: "What types of photography do you offer?", answer: "Portrait, lifestyle, and memory photography with comfort, respect, and privacy as boundaries." },
    { question: "How do we choose a location?", answer: "We can discuss style and budget beforehand. Locations accessible by public transit preferred. Transport costs reimbursed." },
    { question: "I've never done this before. What if I don't know how to pose?", answer: "No worries at all. I'll guide you through poses, expressions, and angles. Just relax and be yourself." },
    { question: "What should I prepare for outfits?", answer: "Feel free to send outfit photos or style references beforehand. Outfit suggestions will be organized on the site later." },
    { question: "Will my photos be shared publicly?", answer: "No, never by default. Only individually authorized photos are displayed. Your privacy is respected." },
    { question: "Can I choose my own location?", answer: "Absolutely. Send me your preferred spot, or describe the vibe you want, and we'll figure out the logistics together." },
    { question: "What if it's cloudy or rainy?", answer: "Light overcast is great for soft photos. In case of heavy rain, we can reschedule — no pressure." },
    { question: "How long until I get my photos?", answer: "Delivery time is confirmed at booking based on volume and editing schedule. Let me know if you have a deadline." },
    { question: "Can I keep my photos private?", answer: "Yes. Photos are private by default. I will never share without your explicit permission." },
    { question: "What about cancellations or rescheduling?", answer: "Deposit ¥50, non-refundable for no-shows. Date changes allowed except for non-severe weather. Late by 15min counts from arrival." },
    { question: "How do we discuss style beforehand?", answer: "Share your preferred style and references before the shoot. If anything's off during the shoot, let me know on the spot." },
  ],
  processSteps: [
    "DM on Xiaohongshu｜Tell me what you're looking for — portrait, couple, or a specific style reference.",
    "Discuss style, outfits, location & references｜Not sure? We'll figure out what suits you together.",
    "Confirm date & deposit｜Lock your slot after confirming time, place, cost and details.",
    "Shoot day with guidance｜Pose, expression, and movement prompts throughout — first-timers welcome.",
    "Select, retouch & deliver｜Choose your favorites after the shoot, retouch as agreed, deliver via cloud.",
  ],
  whyCards: [
    { icon: "heart", title: "First-Timer Friendly", detail: "No experience needed. Posing, expression, and gaze are gently guided. The pace stays relaxed." },
    { icon: "camera", title: "Soft Film Aesthetic", detail: "Natural light, low saturation, everyday authenticity — no harsh studio looks." },
    { icon: "message", title: "Pre-Shoot Communication", detail: "Style, outfits, location, references, and comfort boundaries are discussed beforehand to reduce on-site stress." },
    { icon: "shield", title: "Clear Privacy Protection", detail: "Photos are not shared by default. Only explicitly authorized images are displayed." },
    { icon: "heart", title: "Full Posing Guidance", detail: "From stance to gaze — every detail is gently directed. You just relax and be yourself." },
    { icon: "camera", title: "Nanjing Local Knowledge", detail: "Deep familiarity with Xianlin, Xuanwu Lake, Yihe Road, Purple Mountain, and hidden local spots." },
  ],
  sectionCopy: {
    gallery: {
      eyebrow: "Portfolio",
      title: "Browse Like a Soft Nanjing Album",
      intro: "Organized by park, Jiangnan, street, indoor, and couple styles. All displayed works are authorized by clients.",
    },
    packages: {
      eyebrow: "Pricing",
      title: "Clear Pricing, No Surprises",
      intro: "Indoor, outdoor, and instant add-on packages listed separately. Each includes pre-shoot consultation and guidance.",
    },
    details: {
      eyebrow: "Details",
      title: "Equipment, Pricing & Policies Made Clear",
      intro: "Here's what you need to know about equipment, add-ons, and booking policies before you reserve.",
    },
    notice: {
      eyebrow: "Process",
      title: "First Time? Here's How It Works",
      intro: "From Xiaohongshu DM to shooting, selecting, and delivery — every step is explained upfront.",
    },
    why: {
      eyebrow: "Why Choose Us",
      title: "Clear Boundaries, Relaxed Shoots",
      intro: "Comfort and authorization are discussed beforehand. On-site posing guidance makes it great for first-timers.",
    },
    about: {
      eyebrow: "About",
      title: "Naihuangbao Photography",
      intro: "Booking Info",
      body: "A Nanjing-based solo photographer specializing in portrait and couple photography. Soft film aesthetic for everyday memories, Jiangnan vibes, and relaxed companion shoots.",
      bookingTitle: "Want a gentle, natural photo session?",
      profileLinkLabel: "View Xiaohongshu Profile",
    },
    midCta: {
      eyebrow: "Next Step",
      title: "Like This Style?",
      intro: "DM me on Xiaohongshu with your thoughts. Quick replies. Take your time — happy to answer any questions.",
      actionLabel: "DM on Xiaohongshu",
    },
    footer: {
      tagline: "Every shutter click is a gentle light.",
    },
    safety: {
      title: "Shooting Guidelines & Privacy Commitment",
      paragraphs: [
        "Photos are not shared by default. Only explicitly authorized images are displayed.",
        "Boundaries, style, and comfort are discussed beforehand. On-site posing guidance provided for first-timers.",
      ],
    },
  },
};
