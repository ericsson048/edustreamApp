# 002 — Improve skeleton loader easing curve

- **Status**: TODO
- **Commit**: fe3d920
- **Severity**: HIGH
- **Category**: Easing & duration
- **Estimated scope**: 1 file, ~5min

## Problem

`src/components/SkeletonLoader.tsx:20-21` uses `Easing.ease` (the default RN easing curve) for the pulsing opacity animation. This is a symmetric ease-in-out curve that feels sluggish — it spends too long at the extremes (dim and bright) and transitions too slowly through the middle where the eye is most sensitive.

Current code:
```tsx
// line 20-21
Animated.timing(opacity, { toValue: 0.7, duration: 800, easing: Easing.ease, useNativeDriver: true }),
Animated.timing(opacity, { toValue: 0.3, duration: 800, easing: Easing.ease, useNativeDriver: true }),
```

The cycle is symmetric: 800ms up, 800ms down. The `Easing.ease` curve produces a gentle S-curve, but the plateau at each extreme makes the skeleton feel like it's "resting" too long at full brightness and full dimness.

## Target

Replace `Easing.ease` with `Easing.inOut(Easing.ease)` for a more natural pulse, and make the pulse asymmetric (faster brighten, slower dim) to match how the human eye perceives luminance changes — brighter grabs attention faster.

Target config:
```tsx
Animated.timing(opacity, { toValue: 0.7, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
Animated.timing(opacity, { toValue: 0.3, duration: 700, easing: Easing.in(Easing.ease), useNativeDriver: true }),
```

Or, simpler and more noticeable: switch to a custom cubic-bezier equivalent via `Easing.bezier()`:
```tsx
const pulseEasing = Easing.bezier(0.23, 1, 0.32, 1); // strong ease-out
```
And keep symmetric durations at 600ms each (faster overall cycle).

## Repo conventions to follow

- The file already uses `Animated.timing` with `useNativeDriver: true` — preserve this
- `Easing` is imported from `react-native` (line 1)
- Style uses inline `Animated.View` styles (line 31-32)

## Steps

1. Open `src/components/SkeletonLoader.tsx`
2. Replace the two `Easing.ease` values with `Easing.out(Easing.ease)` and `Easing.in(Easing.ease)` respectively
3. Change the up duration from `800` to `500` and the down duration from `800` to `700`
4. Save

Final code:
```tsx
// line 18-22
const anim = Animated.loop(
  Animated.sequence([
    Animated.timing(opacity, { toValue: 0.7, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    Animated.timing(opacity, { toValue: 0.3, duration: 700, easing: Easing.in(Easing.ease), useNativeDriver: true }),
  ])
);
```

## Boundaries

- Do NOT change the min/max opacity values (0.3 → 0.7) — those are fine
- Do NOT change the component's public API (props, styles)
- Do NOT migrate to reanimated in this plan (that's a separate, lower-priority change)

## Verification

- **Mechanical**: `npx tsc --noEmit` — zero errors
- **Feel check**: Run the app, navigate to a screen showing skeletons (dashboard loading):
  - Pulse should feel faster and more energetic
  - The brighten phase should snap up quickly
  - The dim phase should ease down more gently
  - Overall cycle should be ~200ms faster than before
- **Done when**: Both `Animated.timing` calls use asymmetric easing and durations as specified above
