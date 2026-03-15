import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { palette } from '../theme';

export default function VinylSpinner({ isPlaying, artworkUrl, compact = false }) {
  const rotation = useSharedValue(0);
  const needleProgress = useSharedValue(isPlaying ? 1 : 0);

  useEffect(() => {
    if (isPlaying) {
      rotation.value = 0;
      rotation.value = withRepeat(
        withTiming(360, {
          duration: compact ? 3600 : 4200,
          easing: Easing.linear,
        }),
        -1,
        false
      );
      needleProgress.value = withTiming(1, { duration: 260 });
      return;
    }

    cancelAnimation(rotation);
    needleProgress.value = withTiming(0, { duration: 220 });
  }, [compact, isPlaying, needleProgress, rotation]);

  const vinylStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const needleStyle = useAnimatedStyle(() => ({
    opacity: 0.75 + needleProgress.value * 0.25,
    transform: [
      { rotate: `${-32 + needleProgress.value * 26}deg` },
      { translateX: needleProgress.value * -6 },
      { translateY: needleProgress.value * 8 },
    ],
  }));

  const size = compact ? 188 : 284;
  const innerSize = compact ? 174 : 264;
  const labelSize = compact ? 70 : 108;

  return (
    <View style={[styles.frame, compact && styles.frameCompact]}>
      <Animated.View style={[styles.needleArm, compact && styles.needleArmCompact, needleStyle]}>
        <View style={[styles.needleShaft, compact && styles.needleShaftCompact]} />
        <View style={[styles.needleHead, compact && styles.needleHeadCompact]} />
      </Animated.View>
      <Animated.View
        style={[
          styles.vinylOuter,
          { borderRadius: size / 2, height: size, width: size },
          compact && styles.vinylOuterCompact,
          vinylStyle,
        ]}>
        <View
          style={[
            styles.vinylGrooves,
            { borderRadius: innerSize / 2, height: innerSize, width: innerSize },
          ]}>
          <View style={[styles.ring, compact && styles.ringCompact]} />
          <View style={[styles.ringSmall, compact && styles.ringSmallCompact]} />
          {artworkUrl ? (
            <Image source={{ uri: artworkUrl }} style={{ borderRadius: labelSize / 2, height: labelSize, width: labelSize }} />
          ) : (
            <View
              style={[
                styles.centerLabelFallback,
                { borderRadius: labelSize / 2, height: labelSize, width: labelSize },
              ]}
            />
          )}
          <View style={[styles.centerHole, compact && styles.centerHoleCompact]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  frameCompact: {
    padding: 0,
  },
  needleArm: {
    height: 124,
    position: 'absolute',
    right: 22,
    top: -6,
    width: 124,
    zIndex: 5,
  },
  needleArmCompact: {
    height: 92,
    right: -2,
    top: 2,
    width: 92,
  },
  needleShaft: {
    backgroundColor: '#D9C7B2',
    borderRadius: 999,
    height: 10,
    left: 14,
    position: 'absolute',
    top: 28,
    width: 86,
  },
  needleShaftCompact: {
    height: 8,
    top: 22,
    width: 62,
  },
  needleHead: {
    backgroundColor: '#57443C',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    height: 34,
    position: 'absolute',
    right: 6,
    top: 18,
    width: 12,
  },
  needleHeadCompact: {
    height: 28,
    top: 14,
    width: 10,
  },
  vinylOuter: {
    alignItems: 'center',
    backgroundColor: '#111111',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  vinylOuterCompact: {
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  vinylGrooves: {
    alignItems: 'center',
    backgroundColor: '#171717',
    borderColor: '#2A2A2A',
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  ring: {
    borderColor: '#2E2E2E',
    borderRadius: 999,
    borderWidth: 1,
    height: '84%',
    position: 'absolute',
    width: '84%',
  },
  ringCompact: {
    height: '82%',
    width: '82%',
  },
  ringSmall: {
    borderColor: '#353535',
    borderRadius: 999,
    borderWidth: 1,
    height: '56%',
    position: 'absolute',
    width: '56%',
  },
  ringSmallCompact: {
    height: '54%',
    width: '54%',
  },
  centerLabelFallback: {
    backgroundColor: palette.peach,
  },
  centerHole: {
    backgroundColor: '#F8F3EE',
    borderRadius: 999,
    height: 10,
    position: 'absolute',
    width: 10,
  },
  centerHoleCompact: {
    height: 8,
    width: 8,
  },
});
