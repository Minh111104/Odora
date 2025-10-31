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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../constants/theme';
import { generateScentDescription } from '../services/aiService';

const { width } = Dimensions.get('window');

export default function ARViewScreen({ route, navigation }) {
  const { photoUri, scentDescription } = route.params;

  const [viewMode, setViewMode] = useState('ar'); // 'ar', 'rotate', 'zoom', 'xray', '3d'
  const [scale, setScale] = useState(1);
  const [isGenerating3D, setIsGenerating3D] = useState(false);
  const [generated3DImages, setGenerated3DImages] = useState(null);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [arPlaced, setArPlaced] = useState(false);
  const [showSteam, setShowSteam] = useState(true);
  const [hologramAngles, setHologramAngles] = useState(null);
  const [isGeneratingHologram, setIsGeneratingHologram] = useState(false);
  const [currentHologramAngle, setCurrentHologramAngle] = useState(0); // 0-7 for 8 angles

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const colorShift = useRef(new Animated.Value(0)).current;
  const angleAnim = useRef(new Animated.Value(0)).current;
  const steamAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;
  const hologramRotation = useRef(new Animated.Value(0)).current;
  const hologramFlicker = useRef(new Animated.Value(1)).current;
  const scanlineAnim = useRef(new Animated.Value(0)).current;

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

  // AR Mode animations (steam, glow, float)
  React.useEffect(() => {
    if (viewMode === 'ar') {
      // Steam rising effect
      const steam = Animated.loop(
        Animated.sequence([
          Animated.timing(steamAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(steamAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      // Glow pulse
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      );

      // Subtle floating
      const float = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2500,
            useNativeDriver: true,
          }),
        ])
      );

      // Shadow pulse
      const shadow = Animated.loop(
        Animated.sequence([
          Animated.timing(shadowAnim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: false,
          }),
          Animated.timing(shadowAnim, {
            toValue: 0,
            duration: 2500,
            useNativeDriver: false,
          }),
        ])
      );

      // Hologram rotation
      const rotation = Animated.loop(
        Animated.timing(hologramRotation, {
          toValue: 1,
          duration: 12000,
          useNativeDriver: true,
        })
      );

      // Hologram flicker effect
      const flicker = Animated.loop(
        Animated.sequence([
          Animated.timing(hologramFlicker, {
            toValue: 0.85,
            duration: 100,
            useNativeDriver: false,
          }),
          Animated.timing(hologramFlicker, {
            toValue: 1,
            duration: 100,
            useNativeDriver: false,
          }),
          Animated.timing(hologramFlicker, {
            toValue: 0.9,
            duration: 150,
            useNativeDriver: false,
          }),
          Animated.timing(hologramFlicker, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      );

      // Scanline animation
      const scanline = Animated.loop(
        Animated.timing(scanlineAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      );

      steam.start();
      glow.start();
      float.start();
      shadow.start();
      rotation.start();
      flicker.start();
      scanline.start();

      return () => {
        steam.stop();
        glow.stop();
        float.stop();
        shadow.stop();
        rotation.stop();
        flicker.stop();
        scanline.stop();
      };
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

  // Pan responder for drag gestures (and hologram rotation in AR mode)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (viewMode !== 'ar') {
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
        } else if (viewMode !== 'ar') {
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
        if (viewMode !== 'ar') {
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
    } else if (mode === '3d') {
      // Generate 3D video when mode is selected
      if (!generated3DImages) {
        generate3DVideo();
      } else {
        start3DAnimation();
      }
    } else if (mode === 'ar') {
      // Request camera permission for AR mode
      if (!cameraPermission?.granted) {
        requestCameraPermission();
      }
      setArPlaced(false);
      handleReset();
    } else {
      handleReset();
    }
  };

  const handleArPlacement = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setArPlaced(true);

    // Generate hologram angles if not already generated
    if (!hologramAngles) {
      generateHologramAngles();
    }
  };

  const generateHologramAngles = async () => {
    setIsGeneratingHologram(true);
    try {
      Alert.alert(
        '🔮 Generating Hologram',
        'AI is analyzing your photo and creating realistic 3D angles. This may take 60-90 seconds...',
        [{ text: 'OK' }]
      );

      // Step 1: Analyze the photo ONCE with GPT-4 Vision
      const OpenAI = require('openai').default;
      const { config } = require('../config');
      const FileSystem = require('expo-file-system/legacy');

      const openai = new OpenAI({
        apiKey: config.OPENAI_API_KEY,
      });

      const base64Image = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('Analyzing your food photo with AI...');
      const visionResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe this food in extreme detail for photorealistic recreation. Include: specific food items, exact colors, textures, ingredients visible, garnishes, plating presentation, plate/bowl type, and overall composition. Be very detailed and accurate.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 400,
      });

      const accurateFoodDescription = visionResponse.choices[0].message.content;
      console.log('AI detected:', accurateFoodDescription);

      // Step 2: Generate 8 angles using the accurate description
      const angleInstructions = [
        'straight-on front view',
        '45-degree angle from the right side',
        'direct right side view',
        '135-degree back-right diagonal view',
        'straight back view',
        '225-degree back-left diagonal view',
        'direct left side view',
        '315-degree front-left diagonal view',
      ];

      const generatedAngles = await Promise.all(
        angleInstructions.map(async (angleInstruction, index) => {
          const enhancedPrompt = `${accurateFoodDescription}, photographed from a ${angleInstruction}, hyper-realistic professional food photography, studio lighting, commercial advertising quality, 4K resolution, appetizing presentation, sharp focus`;

          console.log(`Generating angle ${index + 1}/8: ${angleInstruction}`);

          const response = await openai.images.generate({
            model: 'dall-e-3',
            prompt: enhancedPrompt,
            n: 1,
            size: '1024x1024',
            quality: 'hd', // HD quality for maximum realism
          });

          return response.data[0].url;
        })
      );

      setHologramAngles(generatedAngles);
      startHologramRotation();
      setIsGeneratingHologram(false);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '✨ Hologram Ready!',
        'Your AI-enhanced 3D food is ready! The hologram shows your actual dish from 8 different angles.',
        [{ text: 'Amazing!' }]
      );
    } catch (error) {
      console.error('Error generating hologram:', error);
      setIsGeneratingHologram(false);
      Alert.alert(
        'Generation Failed',
        'Could not generate hologram. Using original photo instead.',
        [{ text: 'OK' }]
      );
    }
  };

  const startHologramRotation = () => {
    // Listen to rotation animation and update current angle
    hologramRotation.addListener(({ value }) => {
      const angleIndex = Math.floor(value * 8) % 8;
      setCurrentHologramAngle(angleIndex);
    });
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

  const enhanceFoodPhotoWithAngle = async (imageUri, instruction) => {
    const OpenAI = require('openai').default;
    const { config } = require('../config');
    const FileSystem = require('expo-file-system/legacy').default;

    try {
      const openai = new OpenAI({
        apiKey: config.OPENAI_API_KEY,
      });

      // Step 1: Use GPT-4 Vision to analyze the actual photo
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('Analyzing photo with GPT-4 Vision...');
      const visionResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe this food in extreme detail for food photography recreation. Include: exact food items, colors, textures, garnishes, plating style, lighting, and presentation. Be very specific and detailed.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      });

      const foodDescription = visionResponse.choices[0].message.content;
      console.log('GPT-4 Vision analysis:', foodDescription);

      // Step 2: Use the detailed description to generate the angle with DALL-E 3
      const detailedPrompt = `${foodDescription}. ${instruction}. Hyper-realistic, professional food photography, studio lighting, 4K quality, commercial advertising style, mouth-watering presentation`;

      console.log('Generating enhanced image with DALL-E 3...');
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: detailedPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd', // Use HD quality for maximum realism
      });

      return response.data[0].url;
    } catch (error) {
      console.error('Image enhancement error:', error);

      // Fallback: Use simpler generation
      console.log('Falling back to simple enhancement...');
      const openai = new OpenAI({
        apiKey: config.OPENAI_API_KEY,
      });

      const fallbackPrompt = `Delicious gourmet food dish, ${instruction}, hyper-realistic food photography, professional studio lighting, commercial quality, 4K resolution, appetizing presentation`;

      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: fallbackPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
      });

      return response.data[0].url;
    }
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

  // AR animation interpolations
  const steamTranslateY = steamAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -100],
  });

  const steamOpacity = steamAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 0.3, 0],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const floatTranslateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const shadowScale = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.95],
  });

  const shadowOpacity = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0.3],
  });

  const hologramRotationDeg = hologramRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const scanlineTranslateY = scanlineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  // Get current hologram image based on rotation angle
  const getCurrentHologramImage = () => {
    if (hologramAngles && hologramAngles.length === 8) {
      return hologramAngles[currentHologramAngle];
    }
    return photoUri;
  };

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
      {/* AR Camera Background */}
      {viewMode === 'ar' ? (
        cameraPermission?.granted ? (
          <CameraView style={StyleSheet.absoluteFill} facing="back">
            {/* AR Overlay */}
            <View style={styles.arOverlay}>
              {/* Target reticle for placement */}
              {!arPlaced && (
                <View style={styles.targetContainer}>
                  <View style={styles.targetReticle}>
                    <View style={styles.targetLine} />
                    <View style={[styles.targetLine, styles.targetLineVertical]} />
                    <View style={styles.targetCircle} />
                  </View>
                  <Text style={styles.arInstructionText}>
                    Point at a surface and tap to place food
                  </Text>
                </View>
              )}

              {/* Placed AR Food */}
              {arPlaced && (
                <Animated.View
                  style={[
                    styles.arFoodContainer,
                    {
                      transform: [
                        { translateY: floatTranslateY },
                        { scale: scaleAnim },
                        { rotateY: hologramRotationDeg },
                      ],
                    },
                  ]}
                >
                  {isGeneratingHologram ? (
                    <View style={styles.hologramLoadingContainer}>
                      <ActivityIndicator size="large" color="#00d4ff" />
                      <Text style={styles.hologramLoadingText}>Analyzing Photo...</Text>
                      <Text style={styles.hologramLoadingSubtext}>
                        AI is enhancing your food with realistic 3D angles
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* Hologram projection base */}
                      <View style={styles.hologramBase}>
                        <LinearGradient
                          colors={['rgba(0,212,255,0.3)', 'rgba(0,212,255,0)']}
                          style={styles.hologramBaseGradient}
                        />
                      </View>

                      {/* Shadow under food */}
                      <Animated.View
                        style={[
                          styles.arShadow,
                          {
                            transform: [{ scale: shadowScale }],
                            opacity: shadowOpacity,
                          },
                        ]}
                      />

                      {/* Hologram glow layers (multiple for depth) */}
                      <Animated.View
                        style={[
                          styles.hologramGlowOuter,
                          {
                            opacity: glowOpacity,
                          },
                        ]}
                      />
                      <Animated.View
                        style={[
                          styles.hologramGlowInner,
                          {
                            opacity: glowOpacity,
                          },
                        ]}
                      />

                      {/* Main Food Image with hologram effect */}
                      <Animated.View
                        style={[
                          styles.hologramImageContainer,
                          {
                            opacity: hologramFlicker,
                          },
                        ]}
                      >
                        {/* Back layer for depth */}
                        <Image
                          source={{ uri: getCurrentHologramImage() }}
                          style={[styles.arFoodImage, styles.hologramLayer, { opacity: 0.3 }]}
                        />

                        {/* Main layer */}
                        <Image
                          source={{ uri: getCurrentHologramImage() }}
                          style={[styles.arFoodImage, styles.hologramEffect]}
                        />

                        {/* Front highlight layer */}
                        <Image
                          source={{ uri: getCurrentHologramImage() }}
                          style={[
                            styles.arFoodImage,
                            styles.hologramLayer,
                            { opacity: 0.2, tintColor: '#00d4ff' },
                          ]}
                        />

                        {/* Hologram scanlines */}
                        <Animated.View
                          style={[
                            styles.hologramScanline,
                            {
                              transform: [{ translateY: scanlineTranslateY }],
                            },
                          ]}
                        />

                        {/* Grid overlay for holographic effect */}
                        <View style={styles.hologramGrid}>
                          {[...Array(15)].map((_, i) => (
                            <View
                              key={`h-${i}`}
                              style={[styles.hologramGridLineH, { top: `${(i / 14) * 100}%` }]}
                            />
                          ))}
                          {[...Array(15)].map((_, i) => (
                            <View
                              key={`v-${i}`}
                              style={[styles.hologramGridLineV, { left: `${(i / 14) * 100}%` }]}
                            />
                          ))}
                        </View>

                        {/* Edge glow */}
                        <View style={styles.hologramEdgeGlow} />
                      </Animated.View>

                      {/* Hologram particles floating around */}
                      <View style={styles.hologramParticlesContainer}>
                        {[0, 1, 2, 3, 4].map(i => (
                          <Animated.View
                            key={i}
                            style={[
                              styles.hologramParticle,
                              {
                                left: `${20 + i * 15}%`,
                                top: `${10 + (i % 3) * 30}%`,
                                opacity: glowOpacity,
                              },
                            ]}
                          />
                        ))}
                      </View>

                      {/* AR Info Label with hologram style */}
                      <BlurView intensity={50} style={styles.hologramLabel}>
                        <View style={styles.hologramLabelContent}>
                          <Ionicons name="radio-outline" size={16} color="#00d4ff" />
                          <Text style={styles.hologramLabelText}>
                            3D HOLOGRAM •{' '}
                            {hologramAngles ? `${currentHologramAngle + 1}/8 ANGLES` : 'STANDARD'}
                          </Text>
                        </View>
                      </BlurView>
                    </>
                  )}
                </Animated.View>
              )}

              {/* AR Controls Overlay */}
              {arPlaced && !isGeneratingHologram && (
                <View style={styles.arControlsOverlay}>
                  <TouchableOpacity
                    style={styles.hologramActionButton}
                    onPress={() => {
                      const newAngle = (currentHologramAngle + 1) % 8;
                      setCurrentHologramAngle(newAngle);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Ionicons name="sync" size={24} color="#00d4ff" />
                    <Text style={styles.hologramActionText}>Rotate</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.hologramActionButton}
                    onPress={() => {
                      setArPlaced(false);
                      setHologramAngles(null);
                      setCurrentHologramAngle(0);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    }}
                  >
                    <Ionicons name="refresh" size={24} color="#00d4ff" />
                    <Text style={styles.hologramActionText}>Replace</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Tap to place handler */}
              {!arPlaced && (
                <TouchableOpacity
                  style={StyleSheet.absoluteFill}
                  activeOpacity={1}
                  onPress={handleArPlacement}
                />
              )}
            </View>
          </CameraView>
        ) : (
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={80} color="rgba(255,255,255,0.5)" />
            <Text style={styles.permissionText}>Camera access required for AR</Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        /* Animated Background for non-AR modes */
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
      )}

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

      {/* Main View Container (non-AR modes) */}
      {viewMode !== 'ar' && (
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
      )}

      {/* View Mode Selector */}
      <BlurView intensity={80} style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'ar' && styles.viewModeActive]}
          onPress={() => switchViewMode('ar')}
        >
          <Ionicons
            name="cube-outline"
            size={20}
            color={viewMode === 'ar' ? colors.primary : '#FFF'}
          />
          <Text style={[styles.viewModeText, viewMode === 'ar' && styles.viewModeTextActive]}>
            AR
          </Text>
        </TouchableOpacity>

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

      {/* Scent Description - Only show in non-AR modes */}
      {viewMode !== 'ar' && (
        <BlurView intensity={80} style={styles.descriptionContainer}>
          <View style={styles.descriptionHeader}>
            <Ionicons name="flower-outline" size={20} color={colors.primary} />
            <Text style={styles.descriptionTitle}>Scent Analysis</Text>
          </View>
          <Text style={styles.descriptionText} numberOfLines={3}>
            {scentDescription}
          </Text>
        </BlurView>
      )}

      {/* Controls - Only show in non-AR modes */}
      {viewMode !== 'ar' && (
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
          {viewMode === 'ar' &&
            (arPlaced
              ? isGeneratingHologram
                ? '🔮 Generating 8-angle hologram...'
                : '🔮 3D Hologram active • Swipe to rotate'
              : '📍 Point at surface • Tap to project hologram')}
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
});
