import React from 'react';
import { ImageBackground, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

const PromoBanner = ({ banner, onPress }) => {
  const theme = useTheme();
  return (
    <ImageBackground
      source={{ uri: banner.image }}
      imageStyle={{ borderRadius: 22 }}
      style={{
        padding: 20,
        height: 160,
        borderRadius: 22,
        overflow: 'hidden',
        marginRight: 16,
        width: 280,
        justifyContent: 'space-between',
      }}
    >
      <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 }}>
        {banner.tag}
      </Text>
      <View>
        <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>{banner.title}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 6 }}>{banner.description}</Text>
      </View>
      <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
        {banner.savings} · Rp {Number(banner.price).toLocaleString('id-ID')}
      </Text>
    </ImageBackground>
  );
};

export default PromoBanner;
