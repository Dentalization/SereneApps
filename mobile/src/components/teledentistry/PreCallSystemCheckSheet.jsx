import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors as THEME_COLORS, withOpacity } from '../../theme/colors';
import { typography as TYPOGRAPHY } from '../../theme/dimensions';

const COLORS = THEME_COLORS;

const iconForStatus = (status) => {
  if (status === 'passed') return ['check-circle', COLORS.success];
  if (status === 'warning') return ['alert-circle', COLORS.warning];
  if (status === 'failed') return ['close-circle', COLORS.error];
  return ['minus-circle-outline', COLORS.textMuted];
};

export default function PreCallSystemCheckSheet({
  visible,
  checks = [],
  canJoin = false,
  audioOnly = false,
  joining = false,
  labels = {},
  onClose,
  onJoin,
}) {
  if (!visible) return null;

  return (
    <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 140, backgroundColor: withOpacity(COLORS.black || '#000', 0.52), justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ width: 44, height: 44, borderRadius: 18, backgroundColor: withOpacity(COLORS.primary, 0.12), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <MaterialCommunityIcons name="stethoscope" size={22} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...TYPOGRAPHY.bodyLarge, fontWeight: '900', color: COLORS.textPrimary }}>{labels.title}</Text>
            <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 }}>
              {audioOnly ? labels.joinAudioOnly : labels.ready}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel={labels.close}>
            <MaterialCommunityIcons name="close" size={24} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {checks.map((check) => {
          const [icon, color] = iconForStatus(check.status);
          return (
            <View key={check.key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <MaterialCommunityIcons name={icon} size={22} color={color} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ ...TYPOGRAPHY.bodySmall, color: COLORS.textPrimary, fontWeight: '800' }}>{check.label}</Text>
                <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 }}>{check.message}</Text>
              </View>
            </View>
          );
        })}

        <Button
          mode="contained"
          disabled={!canJoin || joining}
          loading={joining}
          onPress={onJoin}
          style={{ borderRadius: 14, marginTop: 18 }}
          contentStyle={{ height: 48 }}
          buttonColor={COLORS.primary}
        >
          {audioOnly ? labels.joinAudioOnly : labels.ready}
        </Button>
      </View>
    </View>
  );
}
