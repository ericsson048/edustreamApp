import Markdown from 'react-native-markdown-display';
import { Image } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { FontSize, Spacing } from '../theme/colors';

function preprocessHtml(content: string): string {
  return content
    .replace(/<img\s+[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
    .replace(/<img\s+[^>]*src='([^']*)'[^>]*alt='([^']*)'[^>]*\/?>/gi, '![$2]($1)')
    .replace(/<img\s+[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')
    .replace(/<img\s+[^>]*src='([^']*)'[^>]*\/?>/gi, '![]($1)');
}

export function MarkdownRenderer({ content }: { content: string }) {
  const { colors } = useTheme();
  const processed = preprocessHtml(content);

  return (
    <Markdown
      style={{
        body: { color: colors.text, fontSize: FontSize.base, lineHeight: 24 },
        heading1: { fontSize: FontSize['3xl'], fontWeight: '700', color: colors.text, marginTop: Spacing.xl, marginBottom: Spacing.sm },
        heading2: { fontSize: FontSize['2xl'], fontWeight: '700', color: colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
        heading3: { fontSize: FontSize.xl, fontWeight: '700', color: colors.text, marginTop: Spacing.lg, marginBottom: Spacing.xs },
        paragraph: { marginBottom: Spacing.md, lineHeight: 24 },
        link: { color: colors.primary, textDecorationLine: 'underline' },
        list_item: { marginBottom: Spacing.xs },
        bullet_list: { marginBottom: Spacing.md },
        ordered_list: { marginBottom: Spacing.md },
        code_inline: { backgroundColor: colors.surfaceTertiary, color: colors.text, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontFamily: 'monospace', fontSize: FontSize.sm },
        fence: { backgroundColor: colors.surfaceSecondary, padding: Spacing.md, borderRadius: 8, marginBottom: Spacing.md, fontFamily: 'monospace', fontSize: FontSize.sm },
        blockquote: { borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: Spacing.md, marginBottom: Spacing.md, opacity: 0.8 },
        image: { borderRadius: 8, marginVertical: Spacing.md, resizeMode: 'cover' as const },
        table: { borderWidth: 1, borderColor: colors.border, marginBottom: Spacing.md },
        thead: { backgroundColor: colors.surfaceSecondary },
        th: { padding: Spacing.sm, borderWidth: 1, borderColor: colors.border, fontWeight: '600' },
        td: { padding: Spacing.sm, borderWidth: 1, borderColor: colors.border },
        hr: { backgroundColor: colors.border, height: 1, marginVertical: Spacing.lg },
      }}
      rules={{
        image: (node, _children, _parent, styles) => {
          const { src, alt } = node.attributes;
          if (!src) return null;
          return (
            <Image
              key={node.key}
              source={{ uri: src }}
              style={styles.image}
              accessible={!!alt}
              accessibilityLabel={alt || undefined}
            />
          );
        },
      }}
    >
      {processed}
    </Markdown>
  );
}
