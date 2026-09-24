global.__DEV__ = false;

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const MockIcon = ({ name }) => React.createElement(Text, null, name);

  return {
    MaterialCommunityIcons: MockIcon,
  };
});

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  const CameraView = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      recordAsync: jest.fn().mockResolvedValue({ uri: 'file:///fake/video.mp4' }),
      stopRecording: jest.fn(),
    }));
    return React.createElement(View, { testID: 'camera-view', ...props }, props.children);
  });
  CameraView.displayName = 'CameraView';

  return {
    CameraView,
    useCameraPermissions: () => [{ granted: true }, jest.fn().mockResolvedValue({ granted: true })],
    useMicrophonePermissions: () => [{ granted: true }, jest.fn().mockResolvedValue({ granted: true })],
  };
});

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 25600000 }),
}));


jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 25600000 }),
}));
