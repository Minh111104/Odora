import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  PanResponder,
  Dimensions,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../constants/theme';
import { generateScentDescription } from '../services/aiService';

const { width } = Dimensions.get('window');

export default function ARViewScreen({ route, navigation }) {
  const { photoUri, scentDescription } = route.params;

  const [viewMode, setViewMode] = useState('ritual'); // 'ritual', 'zoom'
  const [scale, setScale] = useState(1);
  const [ritualStep, setRitualStep] = useState(0); // 0: placement, 1: served, 2: eating, 3: complete
  const [ritualPlaced, setRitualPlaced] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const ritualGlowAnim = useRef(new Animated.Value(0)).current;
  const handServeAnim = useRef(new Animated.Value(0)).current;
  const forkAnim = useRef(new Animated.Value(0)).current;
  const plateSettleAnim = useRef(new Animated.Value(0)).current;
  const vignetteAnim = useRef(new Animated.Value(0)).current;
  const foodGrowAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for focus mode
  React.useEffect(() => {
    if (viewMode === 'zoom') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [viewMode]);

  // Ritual Mode animations
  React.useEffect(() => {
    if (viewMode === 'ritual' && ritualPlaced) {
      // Gentle glow pulse
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(ritualGlowAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: false,
          }),
          Animated.timing(ritualGlowAnim, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: false,
          }),
        ])
      );

      // Vignette darkening
      Animated.timing(vignetteAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false,
      }).start();

      glow.start();

      return () => {
        glow.stop();
      };
    } else if (viewMode !== 'ritual') {
      vignetteAnim.setValue(0);
    }
  }, [viewMode, ritualPlaced]);

  // Pan responder for drag gestures (and hologram rotation in AR mode, ritual gestures)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (viewMode !== 'ar' && viewMode !== 'ritual') {
          translateX.setOffset(translateX._value);
          translateY.setOffset(translateY._value);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (viewMode === 'ar' && arPlaced && hologramAngles) {
          // Swipe horizontally to rotate hologram
          const swipeDistance = gestureState.dx;
          if (Math.abs(swipeDistance) > 30) {
            const direction = swipeDistance > 0 ? -1 : 1;
            const newAngle = (currentHologramAngle + direction + 8) % 8;
            setCurrentHologramAngle(newAngle);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        } else if (viewMode === 'ritual' && ritualPlaced && ritualStep === 1) {
          // Swipe down to serve food
          const swipeDistance = gestureState.dy;
          if (swipeDistance > 50) {
            handleServeFood();
          }
        } else if (viewMode !== 'ar' && viewMode !== 'ritual') {
          Animated.event(
            [
              null,
              {
                dx: translateX,
                dy: translateY,
              },
            ],
            { useNativeDriver: false }
          )(evt, gestureState);
        }
      },
      onPanResponderRelease: () => {
        if (viewMode !== 'ar' && viewMode !== 'ritual') {
          translateX.flattenOffset();
          translateY.flattenOffset();
        }
      },
    })
  ).current;

  const handleZoomIn = () => {
    const newScale = Math.min(scale + 0.3, 3);
    setScale(newScale);
    Animated.spring(scaleAnim, {
      toValue: newScale,
      useNativeDriver: true,
    }).start();
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale - 0.3, 0.5);
    setScale(newScale);
    Animated.spring(scaleAnim, {
      toValue: newScale,
      useNativeDriver: true,
    }).start();
  };

  const handleReset = () => {
    setScale(1);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const switchViewMode = mode => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setViewMode(mode);
    if (mode === 'zoom') {
      Animated.spring(scaleAnim, {
        toValue: 2,
        useNativeDriver: true,
      }).start();
      setScale(2);
    } else if (mode === 'ritual') {
      // Reset ritual state
      setRitualStep(0);
      setRitualPlaced(false);
      handServeAnim.setValue(0);
      forkAnim.setValue(0);
      plateSettleAnim.setValue(0);
      foodGrowAnim.setValue(0);
      handleReset();
    } else {
      handleReset();
    }
  };

  const handleRitualPlacement = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRitualPlaced(true);
    setRitualStep(1);
  };

  const handleServeFood = () => {
    if (ritualStep !== 1) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Animate serving hand
    Animated.sequence([
      Animated.timing(handServeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(plateSettleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Grow food portion
    Animated.timing(foodGrowAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    // Play serving sound (could add Audio later)
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setRitualStep(2);
    }, 1800);
  };

  const handleTakeBite = () => {
    if (ritualStep !== 2) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animate fork
    Animated.sequence([
      Animated.timing(forkAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.delay(500),
      Animated.timing(forkAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      setRitualStep(3);
      // Could trigger TTS scent description here
    }, 2000);
  };

  // Ritual mode interpolations
  const ritualGlowOpacity = ritualGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const handTranslateY = handServeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 0],
  });

  const handOpacity = handServeAnim.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  const forkTranslateY = forkAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [200, -20, 200],
  });

  const forkRotate = forkAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['45deg', '0deg', '45deg'],
  });

  const plateShake = plateSettleAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -3, 3, -2, 0],
  });

  const vignetteOpacity = vignetteAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  const foodScale = foodGrowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  // Get current image based on mode
  const getCurrentImageUri = () => {
    return photoUri;
  };

  return (
    <View style={styles.container}>
      {/* Ritual Mode - Table Placement */}
      {viewMode === 'ritual' ? (
        <View
          style={styles.ritualContainer}
          {...(ritualPlaced && ritualStep === 1 ? panResponder.panHandlers : {})}
        >
          {/* Darkened vignette background */}
          <Animated.View style={[styles.ritualVignette, { opacity: vignetteOpacity }]} />

          <LinearGradient
            colors={['#1a1a2e', '#2d1810', '#1a1a2e']}
            style={StyleSheet.absoluteFill}
          />

          {!ritualPlaced ? (
            /* Placement Guide */
            <View style={styles.ritualPlacementGuide}>
              <View style={styles.tablePlacementOutline}>
                <View style={styles.plateOutline} />
                <Ionicons name="phone-portrait-outline" size={60} color={colors.primary} />
              </View>
              <Text style={styles.ritualInstructionTitle}>🍽️ Set Your Table</Text>
              <Text style={styles.ritualInstructionText}>
                Place your phone where you'd normally eat{'\n'}
                (on your desk, at your table, or where your plate would be)
              </Text>
              <TouchableOpacity style={styles.ritualPlaceButton} onPress={handleRitualPlacement}>
                <Text style={styles.ritualPlaceButtonText}>I'm Ready</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Ritual Interaction */
            <View style={styles.ritualInteractionContainer}>
              {/* Food Image with Glow */}
              <Animated.View
                style={[
                  styles.ritualFoodContainer,
                  {
                    transform: [{ scale: foodScale }, { translateY: plateShake }],
                  },
                ]}
              >
                {/* Warm glow */}
                <Animated.View style={[styles.ritualGlow, { opacity: ritualGlowOpacity }]} />

                {/* Food image */}
                <Image source={{ uri: photoUri }} style={styles.ritualFoodImage} />

                {/* Steam effect */}
                {ritualStep >= 2 && (
                  <View style={styles.steamContainer}>
                    {[0, 1, 2].map(i => (
                      <Animated.View
                        key={i}
                        style={[
                          styles.steamParticle,
                          {
                            left: `${30 + i * 20}%`,
                            transform: [{ translateY: steamTranslateY }],
                            opacity: steamOpacity,
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}

                {/* Serving hand animation */}
                {ritualStep === 1 && (
                  <Animated.View
                    style={[
                      styles.servingHand,
                      {
                        transform: [{ translateY: handTranslateY }],
                        opacity: handOpacity,
                      },
                    ]}
                  >
                    <Text style={styles.servingHandEmoji}>👋</Text>
                  </Animated.View>
                )}

                {/* Fork animation */}
                {ritualStep === 2 && (
                  <Animated.View
                    style={[
                      styles.forkContainer,
                      {
                        transform: [{ translateY: forkTranslateY }, { rotate: forkRotate }],
                      },
                    ]}
                  >
                    <Text style={styles.forkEmoji}>🍴</Text>
                  </Animated.View>
                )}
              </Animated.View>

              {/* Step instructions */}
              <BlurView intensity={60} style={styles.ritualStepContainer}>
                {ritualStep === 1 && (
                  <TouchableOpacity style={styles.ritualActionButton} onPress={handleServeFood}>
                    <Ionicons name="hand-left-outline" size={32} color={colors.primary} />
                    <Text style={styles.ritualActionTitle}>Swipe Down to Be Served</Text>
                    <Text style={styles.ritualActionSubtext}>
                      Like someone's serving you at home
                    </Text>
                  </TouchableOpacity>
                )}

                {ritualStep === 2 && (
                  <TouchableOpacity style={styles.ritualActionButton} onPress={handleTakeBite}>
                    <Ionicons name="restaurant-outline" size={32} color={colors.primary} />
                    <Text style={styles.ritualActionTitle}>Tap to Take a Bite</Text>
                    <Text style={styles.ritualActionSubtext}>Savor the memory</Text>
                  </TouchableOpacity>
                )}

                {ritualStep === 3 && (
                  <View style={styles.ritualCompleteContainer}>
                    <Ionicons name="heart" size={40} color="#ff6b6b" />
                    <Text style={styles.ritualCompleteTitle}>A Taste of Home</Text>
                    <Text style={styles.ritualCompleteText}>{scentDescription}</Text>
                  </View>
                )}
              </BlurView>
            </View>
          )}
        </View>
      ) : (
        /* Animated Background for non-Ritual modes */
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      {/* Header */}
      <BlurView intensity={80} style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Memory View</Text>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Ionicons name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
      </BlurView>

      {/* Main View Container (non-AR and non-Ritual modes) */}
      {viewMode !== 'ar' && viewMode !== 'ritual' && (
        <View style={styles.viewContainer} {...panResponder.panHandlers}>
          <Animated.View
            style={[
              styles.imageWrapper,
              {
                transform: [
                  { translateX },
                  { translateY },
                  {
                    scale:
                      viewMode === 'zoom' ? Animated.multiply(scaleAnim, pulseAnim) : scaleAnim,
                  },
                ],
              },
            ]}
          >
            <Image source={{ uri: getCurrentImageUri() }} style={styles.image} />
          </Animated.View>
        </View>
      )}

      {/* View Mode Selector */}
      <BlurView intensity={80} style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'ritual' && styles.viewModeActive]}
          onPress={() => switchViewMode('ritual')}
        >
          <Ionicons
            name="restaurant-outline"
            size={18}
            color={viewMode === 'ritual' ? colors.primary : '#FFF'}
          />
          <Text style={[styles.viewModeText, viewMode === 'ritual' && styles.viewModeTextActive]}>
            Ritual
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'zoom' && styles.viewModeActive]}
          onPress={() => switchViewMode('zoom')}
        >
          <Ionicons name="scan" size={18} color={viewMode === 'zoom' ? colors.primary : '#FFF'} />
          <Text style={[styles.viewModeText, viewMode === 'zoom' && styles.viewModeTextActive]}>
            Focus
          </Text>
        </TouchableOpacity>
      </BlurView>

      {/* Scent Description - Only show in non-Ritual modes */}
      {viewMode !== 'ritual' && (
        <BlurView intensity={80} style={styles.descriptionContainer}>
          <View style={styles.descriptionHeader}>
            <Ionicons name="flower-outline" size={20} color={colors.primary} />
            <Text style={styles.descriptionTitle}>Scent Analysis</Text>
          </View>
          <ScrollView
            style={styles.descriptionScrollView}
            showsVerticalScrollIndicator={true}
            persistentScrollbar={true}
          >
            <Text style={styles.descriptionText}>{scentDescription}</Text>
          </ScrollView>
        </BlurView>
      )}

      {/* Controls - Only show in non-Ritual modes */}
      {viewMode !== 'ritual' && (
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={handleZoomOut}>
            <Ionicons name="remove" size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.scaleIndicator}>
            <Text style={styles.scaleText}>{Math.round(scale * 100)}%</Text>
            <Text style={styles.modeLabel}>{viewMode.toUpperCase()}</Text>
          </View>

          <TouchableOpacity style={styles.controlButton} onPress={handleZoomIn}>
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          {viewMode === 'ritual' &&
            (ritualPlaced
              ? ritualStep === 1
                ? '👋 Swipe down to be served'
                : ritualStep === 2
                ? '🍴 Tap to take a bite'
                : '❤️ Enjoy your memory'
              : '🍽️ Prepare your table ritual')}
          {viewMode === 'zoom' && '🔍 Examining details • Pinch to zoom'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  resetButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  imageWrapper: {
    width: width * 0.8,
    height: width * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    resizeMode: 'cover',
    zIndex: 10,
  },
  viewModeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: spacing.lg,
    borderRadius: 16,
    padding: spacing.xs,
    overflow: 'hidden',
  },
  viewModeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  viewModeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  viewModeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  viewModeTextActive: {
    color: colors.primary,
  },
  descriptionContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: 150,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  descriptionTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  descriptionScrollView: {
    maxHeight: 80,
  },
  descriptionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 18,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scaleIndicator: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  scaleText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modeLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  instructions: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  instructionText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  loadingSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: spacing.xs,
  },
  // AR Mode Styles
  arOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetContainer: {
    alignItems: 'center',
  },
  targetReticle: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetLine: {
    position: 'absolute',
    width: 40,
    height: 2,
    backgroundColor: colors.primary,
  },
  targetLineVertical: {
    width: 2,
    height: 40,
  },
  targetCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  arInstructionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.lg,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  arFoodContainer: {
    width: width * 0.7,
    height: width * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arShadow: {
    position: 'absolute',
    bottom: -20,
    width: width * 0.6,
    height: 40,
    borderRadius: width * 0.3,
    backgroundColor: 'rgba(0,0,0,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  arGlow: {
    position: 'absolute',
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.375,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
  },
  arFoodImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    resizeMode: 'cover',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  steamContainer: {
    position: 'absolute',
    top: -100,
    width: '100%',
    height: 100,
  },
  steamParticle: {
    position: 'absolute',
    width: 40,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  arLabel: {
    position: 'absolute',
    bottom: -50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    overflow: 'hidden',
    gap: spacing.xs,
  },
  arLabelText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 200,
  },
  arControlsOverlay: {
    position: 'absolute',
    bottom: 100,
    flexDirection: 'row',
    gap: spacing.lg,
  },
  arActionButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  arActionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: spacing.xl,
  },
  permissionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Hologram Styles
  hologramBase: {
    position: 'absolute',
    bottom: -60,
    width: width * 0.8,
    height: 60,
  },
  hologramBaseGradient: {
    flex: 1,
    borderRadius: width * 0.4,
  },
  hologramGlowOuter: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: '#00d4ff',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
  },
  hologramGlowInner: {
    position: 'absolute',
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.375,
    backgroundColor: '#00ffff',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  hologramImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hologramLayer: {
    position: 'absolute',
  },
  hologramEffect: {
    // Blue tint for hologram look
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  hologramScanline: {
    position: 'absolute',
    width: '100%',
    height: 4,
    backgroundColor: '#00d4ff',
    opacity: 0.5,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  hologramGrid: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    opacity: 0.15,
  },
  hologramGridLineH: {
    width: '100%',
    height: 1,
    backgroundColor: '#00d4ff',
    position: 'absolute',
  },
  hologramGridLineV: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: '#00d4ff',
    left: 0,
  },
  hologramEdgeGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#00d4ff',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  hologramParticlesContainer: {
    position: 'absolute',
    width: '120%',
    height: '120%',
  },
  hologramParticle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00d4ff',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  hologramLabel: {
    position: 'absolute',
    bottom: -60,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.5)',
  },
  hologramLabelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  hologramLabelText: {
    color: '#00d4ff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  hologramActionButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,20,40,0.8)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#00d4ff',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  hologramActionText: {
    color: '#00d4ff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 1,
  },
  hologramLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  hologramLoadingText: {
    color: '#00d4ff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.md,
    letterSpacing: 1,
  },
  hologramLoadingSubtext: {
    color: 'rgba(0,212,255,0.7)',
    fontSize: 14,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  // Ritual Mode Styles
  ritualContainer: {
    flex: 1,
  },
  ritualVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  ritualPlacementGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  tablePlacementOutline: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  plateOutline: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(255,140,66,0.3)',
  },
  ritualInstructionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  ritualInstructionText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  ritualPlaceButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: 30,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  ritualPlaceButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  ritualInteractionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  ritualFoodContainer: {
    width: width * 0.8,
    height: width * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  ritualGlow: {
    position: 'absolute',
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: width * 0.425,
    backgroundColor: '#ff8c42',
    shadowColor: '#ff8c42',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
  },
  ritualFoodImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    resizeMode: 'cover',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  servingHand: {
    position: 'absolute',
    top: -150,
    alignItems: 'center',
  },
  servingHandEmoji: {
    fontSize: 80,
  },
  forkContainer: {
    position: 'absolute',
    right: -50,
  },
  forkEmoji: {
    fontSize: 60,
  },
  ritualStepContainer: {
    borderRadius: 20,
    padding: spacing.lg,
    overflow: 'hidden',
    minWidth: width * 0.8,
    alignItems: 'center',
  },
  ritualActionButton: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  ritualActionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  ritualActionSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  ritualCompleteContainer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  ritualCompleteTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  ritualCompleteText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
