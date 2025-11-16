import React from 'react';

/**
 * Measures anchored headers so scroll views can add the correct top padding.
 */
const useAnchoredHeaderHeight = (fallback = 260) => {
  const heightRef = React.useRef(fallback);
  const [headerHeight, setHeaderHeight] = React.useState(fallback);

  const handleHeaderLayout = React.useCallback((event) => {
    const nextHeight = Math.round(event?.nativeEvent?.layout?.height || 0);
    if (nextHeight && nextHeight !== heightRef.current) {
      heightRef.current = nextHeight;
      setHeaderHeight(nextHeight);
    }
  }, []);

  return { headerHeight, handleHeaderLayout };
};

export default useAnchoredHeaderHeight;
