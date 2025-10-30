import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors, spacing } from '../constants/theme';
import { generateScentDescription } from '../services/aiService';
import { Alert, ActivityIndicator } from 'react-native';

const { width } = Dimensions.get('window');

export default function ARViewScreen({ route, navigation }) {
  const { photoUri, scentDescription } = route.params;

  const [viewMode, setViewMode] = useState('rotate'); // 'rotate', 'zoom', 'xray', '3d'
  const [scale, setScale] = useState(1);
  const [isGenerating3D, setIsGenerating3D] = useState(false);
  const [generated3DImages, setGenerated3DImages] = useState(null);
  const [currentAngle, setCurrentAngle] = useState(0);

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const colorShift = useRef(new Animated.Value(0)).current;
  const angleAnim = useRef(new Animated.Value(0)).current;

  // Auto-rotate animation
  React.useEffect(() => {
    if (viewMode === 'rotate') {
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: true,
        })
      );
      rotateAnimation.start();
      return () => rotateAnimation.stop();
    }
  }, [viewMode]);

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

  // X-ray color shift animation
  React.useEffect(() => {
    if (viewMode === 'xray') {
      const shift = Animated.loop(
        Animated.sequence([
          Animated.timing(colorShift, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(colorShift, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      );
      shift.start();
      return () => shift.stop();
    }
  }, [viewMode]);

  // Pan responder for drag gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        translateX.setOffset(translateX._value);
        translateY.setOffset(translateY._value);
      },
      onPanResponderMove: Animated.event(
        [
          null,
          {
            dx: translateX,
            dy: translateY,
          },
        ],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        translateX.flattenOffset();
        translateY.flattenOffset();
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
    setViewMode(mode);
    if (mode === 'zoom') {
      Animated.spring(scaleAnim, {
        toValue: 2,
        useNativeDriver: true,
      }).start();
      setScale(2);
    } else if (mode === '3d') {
      // Generate 3D video when mode is selected
      if (!generated3DImages) {
        generate3DVideo();
      } else {
        start3DAnimation();
      }
    } else {
      handleReset();
    }
  };

  const generate3DVideo = async () => {
    setIsGenerating3D(true);
    try {
      // Use AI to generate the food description for better prompts
      const foodDescription = await extractFoodFromDescription(scentDescription);

      Alert.alert(
        '🎬 Generating 3D View',
        `Creating realistic 360° views of your ${foodDescription}. This may take 30-60 seconds...`,
        [{ text: 'OK' }]
      );

      // Generate 4 different angles using DALL-E
      const angles = ['front view', '45 degree angle view', 'side view', 'top-down view'];

      const generatedImages = await Promise.all(
        angles.map(async angle => {
          const prompt = `Professional food photography of ${foodDescription}, ${angle}, on a clean white plate, natural lighting, high quality, 4K, commercial food photography style, appetizing presentation`;

          // Call OpenAI DALL-E to generate the image
          const imageUrl = await generateFoodImage(prompt);
          return imageUrl;
        })
      );

      setGenerated3DImages(generatedImages);
      start3DAnimation();
      setIsGenerating3D(false);

      Alert.alert(
        '✨ 3D View Ready!',
        'Your AI-generated 360° food view is ready. Watch it rotate automatically!',
        [{ text: 'Awesome!' }]
      );
    } catch (error) {
      console.error('Error generating 3D video:', error);
      setIsGenerating3D(false);
      Alert.alert(
        'Generation Failed',
        'Could not generate 3D views. Please check your API key and try again.',
        [{ text: 'OK' }]
      );
      setViewMode('rotate');
    }
  };

  const extractFoodFromDescription = async description => {
    // Extract main food item from scent description
    const words = description.toLowerCase().split(' ');
    const foodKeywords = [
      'coffee',
      'bread',
      'cake',
      'soup',
      'rice',
      'noodles',
      'steak',
      'salad',
      'pasta',
      'pizza',
    ];

    for (const word of words) {
      if (foodKeywords.some(food => word.includes(food))) {
        return word;
      }
    }

    // Default fallback
    return 'gourmet dish';
  };

  const generateFoodImage = async prompt => {
    const OpenAI = require('openai').default;
    const { config } = require('../config');

    const openai = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
    });

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    return response.data[0].url;
  };

  const start3DAnimation = () => {
    // Cycle through the 4 generated images to create rotation effect
    const cycleAnimation = Animated.loop(
      Animated.timing(angleAnim, {
        toValue: 3, // 0, 1, 2, 3 (4 images)
        duration: 8000,
        useNativeDriver: false,
      })
    );
    cycleAnimation.start();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const backgroundColor = colorShift.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(26,26,46,0.9)', 'rgba(255,140,66,0.3)'],
  });

  // Get current image based on angle for 3D mode
  const getCurrentImageUri = () => {
    if (viewMode === '3d' && generated3DImages) {
      const angleIndex = Math.floor(currentAngle);
      return generated3DImages[angleIndex] || generated3DImages[0];
    }
    return photoUri;
  };

  // Update current angle when animation value changes
  React.useEffect(() => {
    if (viewMode === '3d') {
      const listenerId = angleAnim.addListener(({ value }) => {
        setCurrentAngle(value % 4); // Cycle through 0-3
      });
      return () => angleAnim.removeListener(listenerId);
    }
  }, [viewMode]);

  return (
    <View style={styles.container}>
      {/* Animated Background */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor }]}>
        <LinearGradient
          colors={
            viewMode === 'xray'
              ? ['#1a1a2e', '#ff8c42', '#16213e']
              : ['#1a1a2e', '#16213e', '#0f3460']
          }
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Header */}
      <BlurView intensity={80} style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AR View</Text>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Ionicons name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
      </BlurView>

      {/* Main View Container */}
      <View style={styles.viewContainer} {...panResponder.panHandlers}>
        {isGenerating3D ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Generating AI 3D Views...</Text>
            <Text style={styles.loadingSubtext}>Creating realistic angles</Text>
          </View>
        ) : (
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
                  { rotateY: viewMode === 'rotate' ? rotate : '0deg' },
                  { perspective: 1000 },
                ],
              },
            ]}
          >
            {/* Multiple image layers for depth */}
            {viewMode === 'rotate' && (
              <>
                <Image
                  source={{ uri: getCurrentImageUri() }}
                  style={[
                    styles.imageShadow,
                    { opacity: 0.3, transform: [{ scale: 0.95 }, { translateX: -10 }] },
                  ]}
                />
                <Image
                  source={{ uri: getCurrentImageUri() }}
                  style={[
                    styles.imageShadow,
                    { opacity: 0.2, transform: [{ scale: 0.9 }, { translateX: -20 }] },
                  ]}
                />
              </>
            )}

            <Image
              source={{ uri: getCurrentImageUri() }}
              style={[styles.image, viewMode === 'xray' && { opacity: 0.8 }]}
            />

            {/* X-Ray overlay effect */}
            {viewMode === 'xray' && (
              <View style={styles.xrayOverlay}>
                <Image
                  source={{ uri: getCurrentImageUri() }}
                  style={[styles.image, { opacity: 0.5, tintColor: '#ff8c42' }]}
                />
              </View>
            )}

            {/* Scan lines for tech effect */}
            {viewMode === 'xray' && (
              <View style={styles.scanLinesContainer}>
                {[...Array(10)].map((_, i) => (
                  <View key={i} style={styles.scanLine} />
                ))}
              </View>
            )}

            {/* 3D Mode indicator */}
            {viewMode === '3d' && generated3DImages && (
              <View style={styles.angleIndicator}>
                <Text style={styles.angleText}>
                  {currentAngle < 1 && '📸 Front View'}
                  {currentAngle >= 1 && currentAngle < 2 && '📐 45° Angle'}
                  {currentAngle >= 2 && currentAngle < 3 && '👉 Side View'}
                  {currentAngle >= 3 && '⬇️ Top View'}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Floating AR markers */}
        {viewMode === 'rotate' && (
          <View style={styles.arMarkersContainer}>
            <View style={[styles.arMarker, styles.markerTopLeft]} />
            <View style={[styles.arMarker, styles.markerTopRight]} />
            <View style={[styles.arMarker, styles.markerBottomLeft]} />
            <View style={[styles.arMarker, styles.markerBottomRight]} />
          </View>
        )}
      </View>

      {/* View Mode Selector */}
      <BlurView intensity={80} style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'rotate' && styles.viewModeActive]}
          onPress={() => switchViewMode('rotate')}
        >
          <Ionicons name="sync" size={20} color={viewMode === 'rotate' ? colors.primary : '#FFF'} />
          <Text style={[styles.viewModeText, viewMode === 'rotate' && styles.viewModeTextActive]}>
            360°
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === '3d' && styles.viewModeActive]}
          onPress={() => switchViewMode('3d')}
        >
          <Ionicons name="cube" size={20} color={viewMode === '3d' ? colors.primary : '#FFF'} />
          <Text style={[styles.viewModeText, viewMode === '3d' && styles.viewModeTextActive]}>
            AI 3D
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'zoom' && styles.viewModeActive]}
          onPress={() => switchViewMode('zoom')}
        >
          <Ionicons name="scan" size={20} color={viewMode === 'zoom' ? colors.primary : '#FFF'} />
          <Text style={[styles.viewModeText, viewMode === 'zoom' && styles.viewModeTextActive]}>
            Focus
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'xray' && styles.viewModeActive]}
          onPress={() => switchViewMode('xray')}
        >
          <Ionicons name="eye" size={20} color={viewMode === 'xray' ? colors.primary : '#FFF'} />
          <Text style={[styles.viewModeText, viewMode === 'xray' && styles.viewModeTextActive]}>
            X-Ray
          </Text>
        </TouchableOpacity>
      </BlurView>

      {/* Scent Description */}
      <BlurView intensity={80} style={styles.descriptionContainer}>
        <View style={styles.descriptionHeader}>
          <Ionicons name="flower-outline" size={20} color={colors.primary} />
          <Text style={styles.descriptionTitle}>Scent Analysis</Text>
        </View>
        <Text style={styles.descriptionText} numberOfLines={3}>
          {scentDescription}
        </Text>
      </BlurView>

      {/* Controls */}
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

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          {viewMode === 'rotate' && '🔄 Auto-rotating • Drag to reposition'}
          {viewMode === '3d' && '🎬 AI-generated 360° views • Watch it rotate'}
          {viewMode === 'zoom' && '🔍 Examining details • Pinch to zoom'}
          {viewMode === 'xray' && '👁️ Enhanced view • See texture layers'}
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
  imageShadow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    resizeMode: 'cover',
  },
  xrayOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  scanLinesContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
  },
  scanLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#ff8c42',
    opacity: 0.3,
  },
  arMarkersContainer: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
  },
  arMarker: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.primary,
    borderWidth: 3,
  },
  markerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  markerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  markerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  markerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
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
  descriptionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 16,
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
  angleIndicator: {
    position: 'absolute',
    top: -50,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,140,66,0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
  },
  angleText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
