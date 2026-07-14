import { useRef, useState } from 'react';
import { FlatList, Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../../src/components/ThemedText';
import { ThemedView } from '../../src/components/ThemedView';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useOnboarding } from '../../src/contexts/OnboardingContext';
import { Spacing, FontSize, BorderRadius } from '../../src/theme/colors';

const { width } = Dimensions.get('window');

const slides = [
  {
    icon: 'school' as const,
    title: 'Welcome to EduStream',
    subtitle: 'Your personalized AI-powered learning platform. Master skills at your own pace.',
  },
  {
    icon: 'git-network' as const,
    title: 'Interactive Skill Trees',
    subtitle: 'Visualize your learning path. Unlock nodes as you progress and track your mastery.',
  },
  {
    icon: 'timer' as const,
    title: 'Focus Mode',
    subtitle: 'Stay in the zone with timed study sessions. Block distractions and maximize productivity.',
  },
  {
    icon: 'stats-chart' as const,
    title: 'Smart Recommendations',
    subtitle: 'AI-curated courses and assignments tailored to your strengths and areas for growth.',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { colors } = useTheme();
  const { completeOnboarding } = useOnboarding();
  const isLast = currentIndex === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  const handleComplete = async () => {
    await completeOnboarding();
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) setCurrentIndex(viewableItems[0].index ?? 0);
  }).current;

  return (
    <ThemedView variant="surface" style={styles.container}>
      <StatusBar style="dark" />
      {!isLast && (
        <TouchableOpacity style={styles.skip} onPress={handleComplete}>
          <ThemedText variant="body" color="link">Skip</ThemedText>
        </TouchableOpacity>
      )}
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name={item.icon} size={64} color={colors.primary} />
            </View>
            <ThemedText variant="h1" bold style={styles.title}>{item.title}</ThemedText>
            <ThemedText variant="body" color="secondary" style={styles.subtitle}>{item.subtitle}</ThemedText>
          </View>
        )}
      />
      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === currentIndex ? colors.primary : colors.surfaceSecondary },
              ]}
            />
          ))}
        </View>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleNext}
        >
          <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skip: { position: 'absolute', top: 60, right: Spacing.xl, zIndex: 10 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing['3xl'] },
  iconWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['5xl'],
  },
  title: { textAlign: 'center', marginBottom: Spacing.md },
  subtitle: { textAlign: 'center', lineHeight: 24 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing['3xl'],
    paddingBottom: Spacing['6xl'],
  },
  dots: { flexDirection: 'row', gap: Spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
