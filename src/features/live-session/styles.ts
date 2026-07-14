import { StyleSheet } from 'react-native';
import { BorderRadius, Spacing } from '../../theme/colors';

export const liveSessionStyles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  liveIcon: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinBtn: {
    flexDirection: 'row',
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCard: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
