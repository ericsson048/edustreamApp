# 001 — Add press-feedback scale animation to all TouchableOpacity components

- **Status**: TODO
- **Commit**: fe3d920
- **Severity**: HIGH
- **Category**: Physicality & origin (press feedback)
- **Estimated scope**: 15+ files, ~30min

## Problem

Every interactive element uses `TouchableOpacity` which only provides a fade effect (`activeOpacity={0.7}` default). There is no scale transform on press — buttons, cards, and icon taps feel dead compared to native apps. Users press UI elements hundreds of times per session; this is the highest-leverage motion improvement.

Current pattern (representative, `src/components/CourseCard.tsx:20`):
```tsx
<TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ marginBottom: Spacing.md }}>
```

No scale animation anywhere in the codebase.

## Target

Every `TouchableOpacity` should scale to ~0.97 on press with a fast spring animation, then spring back on release. The cleanest approach: build a small `PressScale` wrapper component using `react-native-reanimated` (already installed at `^4.1.1`) and `react-native-gesture-handler` (already installed), then wrap all pressable elements.

The React Native `Animated` API alternative is also acceptable if reanimated causes issues, but reanimated is preferred since it's already a dependency and runs animations on the UI thread.

Target config:
```tsx
// spring config — subtle, fast, no visible bounce
{ damping: 20, stiffness: 300, mass: 0.5 }
// → produces ~0.97 scale on press, ~60ms settle
```

## Repo conventions to follow

- Theming uses `useTheme()` from `src/contexts/ThemeContext` for colors
- Components are in `src/components/`, screens in `app/`
- Inline styles with `StyleSheet.create()` pattern

Exemplar: `src/components/SkeletonLoader.tsx` already uses `Animated` from RN — shows the pattern for animation imports.

## Steps

1. **Create `src/components/PressScale.tsx`**:
   - Wraps children in `Pressable` from `react-native-gesture-handler` (already installed)
   - Uses `useAnimatedStyle` + `withSpring` from `react-native-reanimated` for `transform: [{ scale: 0.97 }]` on press start, scale `1` on press end
   - Spring config: `{ damping: 20, stiffness: 300, mass: 0.5 }`
   - Accepts `onPress`, `style`, `children`, `scaleTo` (optional, default 0.97) props
   - Preserves `activeOpacity={0.7}` behaviour via a parallel opacity animation or keeps `TouchableOpacity` nested (simpler)

   ```tsx
   import { Pressable } from 'react-native-gesture-handler';
   import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
   import { type ReactNode } from 'react';

   interface Props {
     onPress?: () => void;
     children: ReactNode;
     style?: any;
     scaleTo?: number;
   }

   export function PressScale({ onPress, children, style, scaleTo = 0.97 }: Props) {
     const scale = useSharedValue(1);
     const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
     return (
       <Pressable
         onPress={onPress}
         onPressIn={() => { scale.value = withSpring(scaleTo, { damping: 20, stiffness: 300, mass: 0.5 }); }}
         onPressOut={() => { scale.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.5 }); }}
       >
         <Animated.View style={[style, animStyle]}>{children}</Animated.View>
       </Pressable>
     );
   }
   ```

2. **Wrap critical pressable elements** (high-frequency first):
   - `src/components/CourseCard.tsx:20` — Replace `<TouchableOpacity>` with `<PressScale>`
   - `app/(tabs)/dashboard.tsx:*` — All `TouchableOpacity` for course cards, category pills, header actions
   - `app/(tabs)/courses.tsx:*` — All `TouchableOpacity` for course cards, filters
   - `app/(tabs)/explore.tsx:*` — All `TouchableOpacity`
   - `app/(tabs)/more/index.tsx:*` — Menu items, logout button
   - `app/(tabs)/more/community.tsx:*` — Community cards
   - `app/(tabs)/schedule.tsx:*` — Session cards
   - `app/(auth)/login.tsx:*` — Sign In button

   Strategy: Wrap the content INSIDE the existing `TouchableOpacity` with `PressScale`, or replace `TouchableOpacity` with `PressScale` (preferred for clean API):
   ```tsx
   // BEFORE
   <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ ... }}>
     <Text>...</Text>
   </TouchableOpacity>
   // AFTER
   <PressScale onPress={onPress} style={{ ... }}>
     <Text>...</Text>
   </PressScale>
   ```

3. **Handle icon-only buttons** (headers):
   - `Dashboard`, `courses`, `explore`, `schedule` headers use `TouchableOpacity` with `Ionicons` inside
   - Wrap these too — icon buttons benefit the most from press feedback

4. **Keep `activeOpacity` where `PressScale` can't be used** — e.g., inside `FlatList` renderItem where reanimated animated views might cause issues. In those cases, use `activeOpacity={0.7}` (default, already set).

## Boundaries

- Do NOT touch `FlatList` renderItem items initially — test on static `TouchableOpacity` first
- Do NOT modify `AlertDialog.tsx` buttons (modal context may need `Pressable` instead of `PressScale`)
- Do NOT add new npm dependencies — reanimated + gesture-handler are already installed
- Do NOT change any layout/spacing values

## Verification

- **Mechanical**: `npx tsc --noEmit` — zero errors
- **Feel check**: Open the app, tap any card or button:
  - Button should subtly shrink (~0.97) the instant your finger touches it
  - Should spring back immediately on release
  - No visible delay, jank, or bounce
  - In DevTools → Animation panel, playback at 10% speed: confirm scale starts at press start, not after
- **Edge cases**: Rapid-tap a button 5× — each press should trigger the scale animation from the current state, not restart from 1
- **Done when**: All `TouchableOpacity` in main screens (`dashboard`, `courses`, `explore`, `schedule`, `more/*`, `login`) are wrapped with `PressScale`
