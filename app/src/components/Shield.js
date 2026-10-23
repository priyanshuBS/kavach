// The big shield on the Guard screen. Its colour and symbol show the state.
import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

const SHIELD = 'M60 6 14 23v32c0 29 19 50 46 59 27-9 46-30 46-59V23L60 6z';

function Symbol({ name }) {
  const stroke = { stroke: '#fff', strokeWidth: 9, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  if (name === 'check') return <Path d="m40 62 14 14 28-30" {...stroke} />;
  if (name === 'alert')
    return (
      <>
        <Path d="M60 38v30" {...stroke} />
        <Circle cx="60" cy="84" r="5.5" fill="#fff" />
      </>
    );
  if (name === 'listen')
    return (
      <>
        <Path d="M42 52v18M54 42v38M66 46v30M78 54v14" {...stroke} strokeWidth={8} />
      </>
    );
  return <Path d="M44 60h32" {...stroke} />; // off
}

export default function Shield({ color, symbol, pulse, size = 180 }) {
  const scale = useRef(new Animated.Value(1)).current;
  const halo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pulse) {
      scale.setValue(1);
      halo.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.04, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.timing(halo, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={{ width: size * 1.35, height: size * 1.25, alignItems: 'center', justifyContent: 'center' }}>
      {pulse && (
        <Animated.View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0] }),
            transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.45] }) }],
          }}
        />
      )}
      <Animated.View style={{ transform: [{ scale }] }}>
        <Svg width={size} height={size * 1.03} viewBox="0 0 120 124">
          <Path d={SHIELD} fill={color} />
          <Path d="M60 16 24 29v26c0 23 14 40 36 48" stroke="#fff" strokeOpacity={0.18} strokeWidth={4} fill="none" />
          <Symbol name={symbol} />
        </Svg>
      </Animated.View>
    </View>
  );
}
