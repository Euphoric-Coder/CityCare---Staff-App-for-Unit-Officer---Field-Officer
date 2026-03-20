import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  Dimensions,
  useColorScheme,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

const LOGO_SIZE = 112;
const RING1 = LOGO_SIZE + 40;
const RING2 = LOGO_SIZE + 80;
const RING3 = LOGO_SIZE + 124;

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const logoScale = useRef(new Animated.Value(0.25)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(20)).current;

  const ring1Scale = useRef(new Animated.Value(0.3)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.3)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const ring3Scale = useRef(new Animated.Value(0.3)).current;
  const ring3Opacity = useRef(new Animated.Value(0)).current;

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(18)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleY = useRef(new Animated.Value(14)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.7)).current;

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');

    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.spring(ring1Scale, {
          toValue: 1,
          tension: 38,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(ring1Opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(ring2Scale, {
          toValue: 1,
          tension: 34,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(ring2Opacity, { toValue: 1, duration: 430, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(ring3Scale, {
          toValue: 1,
          tension: 30,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(ring3Opacity, { toValue: 1, duration: 410, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, tension: 55, friction: 6, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.spring(logoY, { toValue: 0, tension: 55, friction: 7, useNativeDriver: true }),
      ]),
      Animated.delay(60),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(titleY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 340, useNativeDriver: true }),
        Animated.spring(subtitleY, { toValue: 0, tension: 55, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.spring(badgeScale, {
          toValue: 1,
          tension: 55,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(badgeOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.delay(160),
      Animated.sequence([
        Animated.timing(dot1, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(dot1, { toValue: 0.25, duration: 180, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0.25, duration: 180, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0.25, duration: 180, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(dot1, { toValue: 1, duration: 180, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 1, duration: 180, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]),
      ]),
      Animated.delay(300),
      Animated.timing(screenOpacity, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  const gradientColors: [string, string, string] = isDark
    ? ['#022c22', '#064e3b', '#022c22']
    : ['#f0fdf4', '#dcfce7', '#f0fdf4'];

  const ringColor = isDark ? 'rgba(16,185,129,' : 'rgba(5,150,105,';
  const iconTint = isDark ? '#6ee7b7' : '#065f46';
  const iconBgStart = isDark ? '#064e3b' : '#bbf7d0';
  const iconBgEnd = isDark ? '#022c22' : '#86efac';
  const iconBorder = isDark ? 'rgba(52,211,153,0.55)' : 'rgba(5,150,105,0.45)';
  const logoShadowColor = isDark ? '#10b981' : '#059669';
  const dotColor = isDark ? '#10b981' : '#059669';
  const badgeBg: [string, string] = isDark
    ? ['rgba(16,185,129,0.18)', 'rgba(16,185,129,0.06)']
    : ['rgba(5,150,105,0.14)', 'rgba(5,150,105,0.04)'];
  const badgeBorderColor = isDark ? 'rgba(52,211,153,0.35)' : 'rgba(5,150,105,0.30)';

  return (
    <Animated.View
      className="flex-1 items-center justify-center"
      style={{ opacity: screenOpacity, backgroundColor: isDark ? '#022c22' : '#f0fdf4' }}>
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.5, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <View
          style={[
            styles.glowBlob,
            {
              width: width * 0.9,
              height: width * 0.9,
              top: -width * 0.25,
              left: width * 0.05,
              backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(5,150,105,0.07)',
            },
          ]}
        />
        <View
          style={[
            styles.glowBlob,
            {
              width: width * 0.75,
              height: width * 0.75,
              bottom: -width * 0.2,
              right: -width * 0.1,
              backgroundColor: isDark ? 'rgba(6,95,70,0.12)' : 'rgba(187,247,208,0.6)',
            },
          ]}
        />
      </View>

      <View className="flex-1 items-center justify-center">
        <View style={{ width: RING3, height: RING3 }} className="mb-10 items-center justify-center">
          <Animated.View
            style={[
              styles.ring,
              {
                width: RING3,
                height: RING3,
                borderColor: `${ringColor}0.10)`,
                opacity: ring3Opacity,
                transform: [{ scale: ring3Scale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              {
                width: RING2,
                height: RING2,
                borderColor: `${ringColor}0.22)`,
                backgroundColor: `${ringColor}0.03)`,
                opacity: ring2Opacity,
                transform: [{ scale: ring2Scale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              {
                width: RING1,
                height: RING1,
                borderColor: `${ringColor}0.42)`,
                backgroundColor: `${ringColor}0.06)`,
                opacity: ring1Opacity,
                transform: [{ scale: ring1Scale }],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.logoContainer,
              {
                width: LOGO_SIZE,
                height: LOGO_SIZE,
                shadowColor: logoShadowColor,
                borderColor: iconBorder,
                opacity: logoOpacity,
                transform: [{ scale: logoScale }, { translateY: logoY }],
              },
            ]}>
            <LinearGradient
              colors={[iconBgStart, iconBgEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Image
              source={require('../assets/logo.png')}
              style={[styles.logoImage, { tintColor: iconTint }]}
              resizeMode="contain"
            />
            <View
              style={[
                styles.logoSheen,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.45)' },
              ]}
            />
          </Animated.View>
        </View>

        <View className="items-center gap-2">
          <Animated.Text
            className={`font-extrabold tracking-tight ${isDark ? 'text-emerald-50' : 'text-emerald-950'}`}
            style={[
              styles.appName,
              { opacity: titleOpacity, transform: [{ translateY: titleY }] },
            ]}>
            City
            <Text className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>Care</Text>
          </Animated.Text>

          <Animated.View
            className="flex-row items-center gap-3"
            style={{ opacity: subtitleOpacity, transform: [{ translateY: subtitleY }] }}>
            <View className={`h-px w-8 ${isDark ? 'bg-emerald-500/50' : 'bg-emerald-600/40'}`} />
            <Text
              className={`text-xs font-bold tracking-widest ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              SMART CIVIC MANAGEMENT
            </Text>
            <View className={`h-px w-8 ${isDark ? 'bg-emerald-500/50' : 'bg-emerald-600/40'}`} />
          </Animated.View>

          <Animated.Text
            className={`mt-1 text-sm font-normal tracking-wide ${isDark ? 'text-emerald-300/70' : 'text-emerald-800/60'}`}
            style={{ opacity: taglineOpacity }}>
            Empowering cities. Serving citizens.
          </Animated.Text>
        </View>

        <Animated.View
          style={[
            styles.badge,
            {
              borderColor: badgeBorderColor,
              opacity: badgeOpacity,
              transform: [{ scale: badgeScale }],
            },
          ]}
          className="mt-9 flex-row items-center gap-2 overflow-hidden rounded-full px-5 py-2">
          <LinearGradient
            colors={badgeBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.badgeDot, { backgroundColor: dotColor, shadowColor: dotColor }]} />
          <Text
            className={`text-xs font-semibold tracking-wide ${isDark ? 'text-emerald-100/85' : 'text-emerald-900/80'}`}>
            Varanasi Municipal Corporation
          </Text>
        </Animated.View>
      </View>

      <View className="mb-14 flex-row items-center gap-2">
        <Animated.View style={[styles.loadingDot, { backgroundColor: dotColor, opacity: dot1 }]} />
        <Animated.View style={[styles.loadingDot, { backgroundColor: dotColor, opacity: dot2 }]} />
        <Animated.View style={[styles.loadingDot, { backgroundColor: dotColor, opacity: dot3 }]} />
      </View>

      <View className="absolute bottom-7 items-center">
        <Text
          className={`text-xs font-medium tracking-widest ${isDark ? 'text-emerald-700/70' : 'text-emerald-700/50'}`}>
          v1.0.0 • Secure Platform
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glowBlob: {
    position: 'absolute',
    borderRadius: 999,
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
  logoContainer: {
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    elevation: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  logoImage: {
    width: LOGO_SIZE * 0.68,
    height: LOGO_SIZE * 0.68,
  },
  logoSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  appName: {
    fontSize: 50,
    lineHeight: 56,
    letterSpacing: -1.5,
  },
  badge: {
    borderWidth: 1,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 5,
    elevation: 3,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
