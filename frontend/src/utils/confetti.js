import confetti from 'canvas-confetti';

/**
 * Fires a celebratory stream of confetti from both bottom-left and bottom-right sides of the screen.
 */
export const firePlanActiveConfetti = () => {
  const duration = 4 * 1000; // 4 seconds duration
  const animationEnd = Date.now() + duration;

  const frame = () => {
    // Launch from bottom-left corner
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.85 },
      colors: ['#4f46e5', '#a855f7', '#ec4899', '#3b82f6', '#10b981'],
    });

    // Launch from bottom-right corner
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.85 },
      colors: ['#4f46e5', '#a855f7', '#ec4899', '#3b82f6', '#10b981'],
    });

    if (Date.now() < animationEnd) {
      requestAnimationFrame(frame);
    }
  };

  frame();
};
