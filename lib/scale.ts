/**
 * The 7-point PULSE feedback scale, shared between the student feedback page
 * and the admin control room so both stay in sync.
 */
export interface ScaleOption {
  n: number;
  t: string;
  c: string;
  hex: string;
}

export const SCALE: ScaleOption[] = [
  { n: 1, t: "Please don't stop", c: "var(--s1)", hex: "#2FD98A" },
  { n: 2, t: "It's interesting", c: "var(--s2)", hex: "#6ADB6A" },
  { n: 3, t: "I feel it, go on", c: "var(--s3)", hex: "#A8D94F" },
  { n: 4, t: "Reduce the complexity", c: "var(--s4)", hex: "#E2C63F" },
  { n: 5, t: "We need a break", c: "var(--s5)", hex: "#EE9B3C" },
  { n: 6, t: "Boring", c: "var(--s6)", hex: "#F06B41" },
  { n: 7, t: "When will this be over", c: "var(--s7)", hex: "#E8434B" },
];

export const HEX = SCALE.map((s) => s.hex);

export const tint = (v: number) => HEX[Math.min(6, Math.max(0, Math.round(v) - 1))];
