declare module "canvas-confetti" {
  type ConfettiOrigin = {
    x?: number;
    y?: number;
  };

  type ConfettiOptions = {
    particleCount?: number;
    spread?: number;
    startVelocity?: number;
    origin?: ConfettiOrigin;
    colors?: string[];
  };

  export default function confetti(options?: ConfettiOptions): Promise<null> | null;
}
