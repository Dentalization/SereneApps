import { colors as COLORS, withOpacity } from '../../theme/colors';
import { typography as TYPOGRAPHY } from '../../theme/dimensions';

/**
 * StatPill Shared Component
 * @param {string} icon - MaterialCommunityIcons name
 * @param {string} label - Label text
 * @param {string} value - Main value text
 * @param {'vertical' | 'horizontal'} variant - Layout variant
 * @param {object} containerStyle - Optional style overrides
 */
const StatPill = ({ icon, label, value, variant = 'vertical', containerStyle }) => {
  const isVertical = variant === 'vertical';

  return (
    <View
      style={[
        {
          borderRadius: 16,
          backgroundColor: isVertical ? withOpacity(COLORS.textPrimary, 0.3) : withOpacity(COLORS.white, 0.15),
          padding: isVertical ? 12 : 10,
          alignItems: 'center',
          flexDirection: isVertical ? 'column' : 'row',
          flex: isVertical ? 1 : undefined,
          marginHorizontal: isVertical ? 6 : 0,
          marginRight: isVertical ? 0 : 12,
        },
        containerStyle,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={isVertical ? 20 : 18} color={COLORS.white} />
      <View style={{ 
        marginLeft: isVertical ? 0 : 8,
        alignItems: isVertical ? 'center' : 'flex-start',
        marginTop: isVertical ? 4 : 0,
      }}>
        <Text style={{ color: withOpacity(COLORS.white, 0.7), ...TYPOGRAPHY.overline }}>
          {label}
        </Text>
        <Text style={{ color: COLORS.white, ...TYPOGRAPHY.h5, fontWeight: '700', marginTop: 2 }}>
          {value}
        </Text>
      </View>
    </View>
  );
};

export default StatPill;
