export function calculateSM2(
  quality: number,
  repetition: number,
  interval: number,
  easeFactor: number
) {
  let newInterval = interval;
  let newRepetition = repetition;
  let newEaseFactor = easeFactor;

  if (quality >= 3) {
    if (repetition === 0) {
      newInterval = 1;
    } else if (repetition === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newRepetition += 1;
  } else {
    newRepetition = 0;
    newInterval = 1;
  }

  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  return {
    interval: newInterval,
    repetition: newRepetition,
    easeFactor: newEaseFactor,
  };
}
