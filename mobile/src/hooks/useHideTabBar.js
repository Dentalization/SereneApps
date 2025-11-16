import React from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Hides the bottom tab bar while the current screen is focused.
 * Works for nested stack navigators by crawling up to the tab parent.
 */
const useHideTabBar = (navigation) => {
  useFocusEffect(
    React.useCallback(() => {
      const stackParent = navigation?.getParent?.();
      const tabParent = stackParent?.getParent?.() || stackParent;
      if (!tabParent?.setOptions) {
        return undefined;
      }

      tabParent.setOptions({ tabBarStyle: { display: 'none' } });
      return () => tabParent.setOptions({ tabBarStyle: undefined });
    }, [navigation])
  );
};

export default useHideTabBar;
