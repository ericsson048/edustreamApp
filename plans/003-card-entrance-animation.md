# 003 — Add fade-in entrance animation to course cards and list items

- **Status**: TODO
- **Commit**: fe3d920
- **Severity**: MEDIUM
- **Category**: Missed opportunities (entrance)
- **Estimated scope**: 3-5 files, ~20min

## Problem

Course cards, category pills, and list items on the dashboard, courses, and explore screens appear instantly when data loads. There is no entrance animation — content teleports onto the screen, which feels jarring compared to native apps where content fades and moves into place.

Key locations:
- `app/(tabs)/dashboard.tsx` — recommended courses, enrolled courses, category pills
- `app/(tabs)/courses.tsx` — course list, category filters
- `app/(tabs)/explore.tsx` — search results, category pills

The lists use `ScrollView` with `.map()`, not `FlatList` — items are rendered all at once.

## Target

Each card/pill should fade in + translate up slightly when it first appears. Since these are loaded from API data, the trigger is the data arriving and the component re-rendering.

Target animation per item:
- Initial: `opacity: 0, translateY: 12`
- Final: `opacity: 1, translateY: 0`
- Duration: 300ms
- Easing: `Easing.out(Easing.ease)` (fast start, gentle settle)
- Stagger: 50ms between items (so cards enter one after another, not all at once)

Use React Native's `Animated` API (no new dependencies). Create a reusable `FadeIn` component.

## Repo conventions to follow

- `src/components/SkeletonLoader.tsx` shows the RN `Animated` pattern — use the same approach
- `useRef(new Animated.Value(...))` for animated values
- `useEffect` to trigger animation on mount
- `useNativeDriver: true` for opacity + transform (both are supported)

## Steps

1. **Create `src/components/FadeIn.tsx`**:
   ```tsx
   import { Animated, type ViewStyle } from 'react-native';
   import { useEffect, useRef, type ReactNode } from 'react';

   interface Props {
     children: ReactNode;
     delay?: number;
     duration?: number;
     style?: ViewStyle;
   }

   export function FadeIn({ children, delay = 0, duration = 300, style }: Props) {
     const opacity = useRef(new Animated.Value(0)).current;
     const translateY = useRef(new Animated.Value(12)).current;

     useEffect(() => {
       const timer = setTimeout(() => {
         Animated.parallel([
           Animated.timing(opacity, { toValue: 1, duration, easing: Easing.out(Easing.ease), useNativeDriver: true }),
           Animated.timing(translateY, { toValue: 0, duration, easing: Easing.out(Easing.ease), useNativeDriver: true }),
         ]).start();
       }, delay);
       return () => clearTimeout(timer);
     }, []);

     return (
       <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
         {children}
       </Animated.View>
     );
   }
   ```

   (Add `import { Easing } from 'react-native';` at the top.)

2. **Wrap course cards in `app/(tabs)/dashboard.tsx`**:
   - Find the recommended courses `.map()` block (around line ~130-140)
   - Import `FadeIn` from `../../src/components/FadeIn`
   - Wrap each card + index-based stagger:
     ```tsx
     {recommended.map((course, i) => (
       <FadeIn key={course.id} delay={i * 50}>
         <CourseCard ... />
       </FadeIn>
     ))}
     ```

3. **Wrap enrolled courses in `app/(tabs)/dashboard.tsx`**:
   - Same pattern, stagger by index

4. **Wrap course items in `app/(tabs)/courses.tsx`**:
   - Find the course `.map()` block
   - Wrap with `FadeIn` + stagger

5. **Wrap category pills** (horizontal ScrollView items):
   - These are simpler — a shorter stagger (30ms) since they're smaller elements
   - Same `FadeIn` wrapper with `delay={i * 30}`

## Boundaries

- Do NOT animate items that already use `FlatList` (messages, conversations) — FlatList virtualizes children and entrance animations cause visual glitches during scroll
- Do NOT wrap the `SkeletonLoader` — skeletons are already animated
- Do NOT add new npm dependencies
- Do NOT change any layout/spacing values
- Do NOT animate tab bar items

## Verification

- **Mechanical**: `npx tsc --noEmit` — zero errors
- **Feel check**: Navigate to dashboard:
  - Cards should fade in + slide up 12px over 300ms
  - Each card should start ~50ms after the previous one (visible cascade)
  - The animation should only play once on mount, not on every re-render
  - Pull-to-refresh should replay the entrance (data changes → new keys → re-trigger)
- **Done when**: Dashboard recommended courses, enrolled courses, and category pills all have fade-in + stagger on mount
