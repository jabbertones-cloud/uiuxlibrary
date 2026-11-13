const WEIGHTS = { taskClarity: 20, navigation: 20, actionFeedback: 15,
  visualHierarchy: 15, accessibility: 15, resilience: 15 };
export function recordedNativeRating(review, validatedKeys) {
  const empty = { score: null, state: 'NOT_RATED', reason: 'Human visual and task evidence not supplied' };
  if (!review) return empty;
  if (review.reviewer?.kind !== 'human' || !review.reviewer.id)
    return { ...empty, reason: 'Human reviewer provenance missing' };
  let weighted = 0;
  for (const [axis, weight] of Object.entries(WEIGHTS)) {
    const item = review.axes?.[axis];
    if (!item || !Number.isInteger(item.value) || item.value < 0 || item.value > 5 ||
        !validatedKeys.has(item.cell) || typeof item.rationale !== 'string' ||
        item.rationale.trim().length < 12)
      return { ...empty, reason: 'Rating axis lacks anchored evidence: ' + axis };
    weighted += item.value * weight / 5;
  }
  return { score: Number(weighted.toFixed(1)), state: 'HUMAN_REVIEW_RECORDED',
    independentTaskSuccessProven: false, releaseEligible: false };
}
