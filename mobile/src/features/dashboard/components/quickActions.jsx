import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const QuickActions = ({ actions = [] }) => {
  const theme = useTheme();

  if (!actions.length) return null;

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
      <View
        style={{
          backgroundColor: '#F8FAFC',
          borderRadius: 24,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderWidth: 1,
          borderColor: 'rgba(148,163,184,0.25)',
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: '#64748B',
                fontSize: 11,
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 2,
              }}
            >
              Quick actions
            </Text>
            <Text
              style={{
                color: '#0F172A',
                fontSize: 16,
                fontWeight: '700',
              }}
            >
              Akses kilat
            </Text>
            <Text
              style={{
                color: '#94A3B8',
                marginTop: 2,
                fontSize: 11,
              }}
            >
              Mulai perawatanmu dalam sekali sentuh
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            marginTop: 8,
          }}
        >
          {actions.map((action) => (
            <TouchableOpacity
              key={action.key}
              onPress={action.onPress}
              activeOpacity={0.8}
              style={{
                flexBasis: '32%',
                maxWidth: '32%',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: action.tint || 'rgba(15,23,42,0.03)',
                  borderWidth: 1,
                  borderColor: 'rgba(148,163,184,0.4)',
                }}
              >
                <MaterialCommunityIcons
                  name={action.icon}
                  size={22}
                  color={action.iconColor || theme.colors.primary}
                />
              </View>
              <Text
                style={{
                  color: '#0F172A',
                  fontWeight: '600',
                  fontSize: 12,
                  marginTop: 8,
                  textAlign: 'center',
                }}
                numberOfLines={2}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

export default QuickActions;
