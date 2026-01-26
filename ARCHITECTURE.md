# 🏗️ Odora Architecture Overview

## App Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         App.js                              │
│              (Navigation Container)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │  Stack Navigator  │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌────────────────┐   ┌──────────────────┐
│  HomeScreen   │───>│ CaptureScreen  │──>│DescriptionEdit   │
│               │    │                │   │    Screen        │
│ - Memory Grid │    │ - Camera       │   │                  │
│ - Search/Tags │    │ - Audio Rec    │   │ - Edit AI Text   │
│ - Settings    │    │ - Photo Preview│   │ - Add Tags       │
│ - FAB Button  │    │ - Processing   │   │ - Save Memory    │
└───────┬───────┘    └────────────────┘   └────────┬─────────┘
        │                                          │
        │            ┌──────────────────┐          │
        └───────────>│ PlaybackScreen   │<─────────┘
                     │                  │
                     │ - Photo Display  │
                     │ - Audio Playback │
                     │ - TTS 11Labs/Expo|
                     │ - Star Rating    │
                     │ - 3D View (AR)   │
                     └─────────┬────────┘
                               │
                               ▼
                       ┌─────────────┐
                       │ARViewScreen │
                       │ Ritual/Zoom │ 
                       │Streak/Badges│
                       └─────────────┘
                              ▲
                              │
                       ┌────────────┐
                       │ Settings   │
                       │ - Data Mgmt│
                       │ - Stats    │
                       └────────────┘
```

## Service Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      SCREENS LAYER                          │
│  HomeScreen | CaptureScreen | DescriptionEditScreen |       │
│             PlaybackScreen                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                    SERVICES LAYER                                                           │
│                                                                                             │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
│  │  aiService.js    │   │ storageService.js│   │  fileService.js  │   │  ttsService.js   │  │
│  │                  │   │                  │   │                  │   │                  │  │
│  │ - gpt-4o-mini    │   │ - AsyncStorage   │   │ - Persist images │   │ - ElevenLabs TTS │  │
│  │ - Description    │   │ - CRUD/ratings   │   │ - Delete images  │   │ - Expo Speech    │  │
│  │                  │   │                  │   │                  │   │   Fallback       │  │
│  │ - Suggestions    │   │ - Tags           │   │                  │   │                  │  │
│  └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘  │
│           │                      │                      │                      │            │
└───────────┼──────────────────────┼──────────────────────┼──────────────────────┼────────────┘
            │                      │                      │                      │
            ▼                      ▼                      ▼                      ▼
┌──────────────────┐   ┌────────────────────┐   ┌────────────────────┐   ┌────────────────────┐
│  OpenAI API      │   │  Device Storage    │   │  FileSystem (local)│   │ ElevenLabs API     │
│  (External)      │   │  (AsyncStorage)    │   │  (expo-file-system)│   │ (External)         │
└──────────────────┘   └────────────────────┘   └────────────────────┘   └────────────────────┘
```

## Data Flow: Creating a Memory

```
1. USER ACTION
   └─> Tap Camera FAB
       │
2. CAPTURE SCREEN
   ├─> Request Permissions
   │   ├─> Camera ✓
   │   ├─> Microphone ✓
   │   └─> Media Library ✓
   │
   ├─> Capture Photo
   │   └─> Store in state (base64 + URI)
   │
   ├─> Record Audio (Optional)
   │   ├─> Start Recording (max 30s)
   │   ├─> Display Timer
   │   └─> Stop & Save URI
   │
   └─> Process Memory
       │
3. AI SERVICE
     ├─> Send photo base64 to OpenAI (model gpt-4o-mini)
     ├─> Receive scent description (2-3 sentences)
     └─> Navigate to DescriptionEdit
       │
4. DESCRIPTION EDIT SCREEN
     ├─> Display AI Description (editable; saved as scentDescription)
     ├─> Allow User Edits
     ├─> Select Tags (common/custom, manage list)
     └─> Save Memory (image persisted to FileSystem)
       │
5. STORAGE SERVICE
     ├─> Create Memory Object
     │   ├─> id: timestamp
     │   ├─> photoUri (permanent)
     │   ├─> audioUri (optional)
     │   ├─> scentDescription (edited text)
     │   ├─> tags[]
     │   ├─> reminderRating (null)
     │   └─> timestamp
     │
     ├─> Save to AsyncStorage
     └─> Navigate to Home
       │
6. HOME SCREEN
   └─> Display Updated Memory Grid
```

## Data Flow: Playback Experience

```
1. USER ACTION
   └─> Tap Memory Card
       │
2. PLAYBACK SCREEN
     ├─> Load Memory by ID
     │   └─> storageService.getMemoryById()
     │
     ├─> Display Photo (warm overlay)
     ├─> Show Description (editable field stored in scentDescription)
     ├─> Read Aloud Button
     │   ├─> ElevenLabs TTS if configured
     │   └─> Fallback to Expo Speech
     ├─> Audio Playback (if exists)
     │   ├─> Load from URI
     │   ├─> Loop Continuously
     │   └─> Play/Stop Toggle
     ├─> Rating System (1-5) -> storageService.rateMemory()
     ├─> Tag Editor Modal (add/remove tags)
     └─> Navigate to ARView (3D ritual/zoom)
```

## Memory Object Structure

```javascript
{
  // Unique identifier
  id: "1698234567890",

  // Media files
  photoUri: "file:///path/to/photo.jpg",
  audioUri: "file:///path/to/audio.m4a" | null,

  // Descriptions
     scentDescription: "User-edited AI description...",
     customDescription: null, // reserved, not currently populated

  // Metadata
  tags: ["Mom's Cooking", "Dinner"],
  timestamp: 1698234567890,

  // User engagement
     reminderRating: 4,  // 1-5 stars

  // Future: Family collaboration
  familyVoices: [
    {
      name: "Mom",
      audioUri: "file:///path/to/mom-voice.m4a",
      timestamp: 1698234567890
    }
  ]
}
```

## Component Dependencies

```
App.js
├── @react-navigation/native
├── @react-navigation/native-stack
└── Screens
     ├── HomeScreen
     │   ├── React Native (View, Text, FlatList, Image)
     │   ├── @expo/vector-icons (Ionicons)
     │   ├── expo-linear-gradient
     │   ├── storageService
     │   └── theme
     │
     ├── CaptureScreen
     │   ├── expo-camera (Camera)
     │   ├── expo-av (Audio)
     │   ├── expo-image-picker
     │   ├── expo-haptics
     │   ├── @expo/vector-icons
     │   ├── expo-linear-gradient
     │   ├── aiService
     │   └── theme
     │
     ├── DescriptionEditScreen
     │   ├── React Native (TextInput, ScrollView)
     │   ├── @expo/vector-icons
     │   ├── expo-linear-gradient
     │   ├── expo-haptics
     │   ├── storageService
     │   ├── fileService
     │   └── theme
     │
     ├── PlaybackScreen
     │   ├── expo-av (Audio)
     │   ├── expo-speech (Speech fallback)
     │   ├── expo-haptics
     │   ├── @expo/vector-icons
     │   ├── expo-linear-gradient
     │   ├── React Native (Animated)
     │   ├── storageService
     │   ├── ttsService (ElevenLabs)
     │   └── theme
     │
     ├── ARViewScreen
     │   ├── React Native (Animated, PanResponder)
     │   ├── expo-haptics
     │   ├── expo-blur
     │   ├── expo-linear-gradient
     │   └── aiService (optional regen)
     │
     └── SettingsScreen
          ├── AsyncStorage (stats)
          ├── storageService
          ├── expo-haptics
          └── theme
```

## State Management Overview

### HomeScreen State

```javascript
[memories, setMemories][(loading, setLoading)]; // Array of memory objects // Boolean for initial load
```

### CaptureScreen State

```javascript
[hasPermission][capturedImage][audioUri][isRecording][isProcessing][recordingDuration][ // Camera permissions (mic requested separately) // Photo object with base64 // Audio file URI // Recording status // AI processing status // Timer in seconds (auto-stop at 30s)
  audioPermission
]; // Microphone permission state
```

### DescriptionEditScreen State

```javascript
[description][selectedTags][isSaving][commonTags][editMode]; // Editable description text (saved as scentDescription) // Array of selected tags (common/custom) // Save operation status // Managed common tags list // Common tag management toggle
```

### PlaybackScreen State

```javascript
[memory][isPlaying][sound][isSpeaking][rating][editingTags][showTagModal]; // Full memory object // Audio playback status // Audio.Sound instance // TTS status (ElevenLabs or expo-speech) // User's rating (1-5) // Tag editor state // Tag modal visibility
```

### ARViewScreen State (key)

```javascript
[viewMode][ritualStep][(currentStreak, totalRituals, badges)][(scale, translateX, translateY)]; // 'ritual' or 'zoom' // Progress through ritual flow // Gamification // Gestures/zoom
```

## API Integration Flow

```
CaptureScreen
     │
     │ (Photo captured with base64)
     │
     ▼
┌──────────────────────────────────────┐
│     aiService.js                     │
│  generateScentDescription()          │
└──────────────────────────────────────┘
     │
     │ (Send to OpenAI)
     │
     ▼
┌──────────────────────────────────────┐
│   OpenAI Chat Completions            │
│   Model: gpt-4o-mini                 │
│                                      │
│   Prompt:                            │
│   "Describe the aromas and smells    │
│    of this food in vivid, sensory    │
│    detail..."                        │
└──────────────────────────────────────┘
     │
     │ (Receive description)
     │
     ▼
DescriptionEditScreen
     │
     │ (User edits & saves; image persisted to FileSystem)
     │
     ▼
AsyncStorage (Local)
```

## Performance Considerations

### Image Handling

- Capture at 0.8 quality (balance between size/quality)
- Store URI reference (not full base64 in storage)
- Generate base64 only for API calls

### Audio Handling

- Max 30 second recordings (auto-stop)
- High quality preset
- Store as compressed m4a
- Loop continuously during playback

### Storage Optimization

- AsyncStorage limit: ~10MB
- Each memory ≈ 100-500KB (depending on photo)
- Recommend max 50-100 memories
- Future: Implement pagination/cleanup

### API Optimization

- Use `gpt-4o-mini` for both image and text calls
- Cache responses where helpful
- Handle OpenAI and ElevenLabs errors with fallbacks (expo-speech)
- Rate limiting for development
- Retry logic for network issues (not yet implemented)

## Security & Privacy

```
┌─────────────────────────────────────┐
│         User's Device               │
│                                     │
│  Photos ────> Local Storage         │
│  Audio  ────> (AsyncStorage)        │
│  Ratings ───>                       │
│                                     │
│  Base64 ────> OpenAI API            │
│  (transient)  (not stored by us)    │
└─────────────────────────────────────┘

Notes:
- No server-side storage in MVP
- All data stays on device (AsyncStorage + FileSystem)
- API keys in .env (never committed)
- Photos sent to OpenAI temporarily
- No personal data collected
```

## Future Architecture Enhancements

### Phase 2: Cloud Sync

```
Device A ─────┐
              ├──> Firebase/Supabase <──┬─── Device B
Device C ─────┘                         └─── Web App
```

### Phase 3: Family Collaboration

```
Student Device <──> Cloud Storage <──> Family Devices
                         │
                    Share Tokens
                         │
                    Voice Recordings
```

### Phase 4: ML Enhancement

```
User Ratings ──> Local ML Model ──> Improved Descriptions
     │
Custom Model Training (per user)
     │
Better Scent Predictions
```

---

## Quick Reference: Key Files

| File                             | Purpose                                 | Dependencies                              |
| -------------------------------- | --------------------------------------- | ----------------------------------------- |
| App.js                           | Navigation setup                        | React Navigation                          |
| screens/HomeScreen.js            | Memory grid, search, filters            | storageService, theme                     |
| screens/CaptureScreen.js         | Camera/Audio capture                    | Camera, Audio, aiService                  |
| screens/DescriptionEditScreen.js | Edit & tag, persist image               | storageService, fileService, theme        |
| screens/PlaybackScreen.js        | Playback, TTS, rating, tags, AR entry   | Audio, Speech, ttsService, storageService |
| screens/ARViewScreen.js          | Ritual/zoom AR experience, gamification | Haptics, BlurView, aiService (regen)      |
| screens/SettingsScreen.js        | Stats, data management                  | AsyncStorage, storageService              |
| services/aiService.js            | OpenAI integration                      | openai package (gpt-4o-mini)              |
| services/storageService.js       | Data persistence                        | AsyncStorage                              |
| services/fileService.js          | Persist/delete media                    | expo-file-system                          |
| services/ttsService.js           | ElevenLabs + fallback                   | fetch, expo-av, expo-speech               |
| constants/theme.js               | Design system                           | None                                      |

---

**Last Updated:** January 25, 2026
