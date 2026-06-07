global.__DEV__ = false;

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const MockIcon = ({ name }) => React.createElement(Text, null, name);

  return {
    MaterialCommunityIcons: MockIcon,
  };
});
