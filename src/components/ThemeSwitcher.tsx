import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeSwitcher({ size = 22 }: { size?: number }) {
  const { isDark, toggleScheme, colors } = useTheme();

  return (
    <TouchableOpacity onPress={toggleScheme} style={{ marginLeft: 8 }}>
      <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={size} color={colors.text} />
    </TouchableOpacity>
  );
}
