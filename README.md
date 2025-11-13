# 🌸 Odora — Scent Memory Journal

**Because sometimes, remembering how something smelled is just as powerful as smelling it again.**

Odora is a mobile app designed to help homesick students recreate scent memories through multisensory triggers. Using AI-generated descriptions and ambient sounds, we bring students closer to home—one meal at a time.

## 🎯 The Problem

International students often miss the familiar scents of home-cooked meals. While we can't digitize smell (yet), Odora does something better: it helps your brain recreate smell memories through multisensory experiences.

## ✨ Features

- 📸 **Photo + Audio Recording**

  - Capture images of food with camera or gallery
  - Record ambient cooking sounds (10-30 seconds)
  - Images saved to permanent storage

- 🤖 **AI Scent Description Generator**

  - GPT-4 Vision API analyzes food photos
  - Generates vivid, sensory-rich descriptions
  - User can edit and personalize descriptions

- 🎭 **Ritual Mode** — Immersive 4-step experience

  - **Placement:** Set your table (phone positioning)
  - **Served:** Swipe down to be served (hand animation)
  - **Take a Bite:** Tap to eat (fork animation)
  - **Completion:** View stats, badges, and memory notes

- 🔍 **Focus Mode** — Detailed inspection

  - Zoom and pan to examine food details
  - Pinch to zoom functionality
  - Scrollable scent analysis

- 🎮 **Gamification System**

  - Daily streak tracking (consecutive days)
  - Total ritual counter (lifetime completions)
  - 6 achievement badges (First Bite, 3-Day Warmth, 7-Day Table Reunion, Memory Keeper, One Month with Mom's Cooking, Home Chef)
  - Firework celebrations on ritual completion
  - Badge earned popups with animations

- 📊 **Scent Memory Journal**
  - Rate how well you "remembered" the smell (1-5 stars)
  - Build personal library of food memories
  - Tag system for organization

## 🛠️ Tech Stack

- **Frontend:** React Native (Expo SDK ~54)
- **AI:** OpenAI GPT-4 Vision API
- **Audio:** Expo AV (recording & playback)
- **Text-to-Speech:** Expo Speech
- **Storage:** AsyncStorage (local persistence) + FileSystem (permanent images)
- **Navigation:** React Navigation
- **UI/UX:** Expo Blur, Linear Gradients, Haptic Feedback, Smooth Animations

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (or Expo Go app on physical device)
- OpenAI API key

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Minh111104/Odora.git
   cd Odora
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your OpenAI API key:

   ```
   OPENAI_API_KEY=your-openai-api-key-here
   ```

4. **Start the development server**

   ```bash
   npm start
   ```

5. **Run on your device**
   - Scan the QR code with Expo Go (iOS/Android)
   - Press `i` for iOS simulator
   - Press `a` for Android emulator

## 📱 User Flow

```
Open App → Home Screen (Memory Library)
   ↓
"Create Memory" button (Camera FAB)
   ↓
Camera opens → Take photo OR upload from gallery
   ↓
(Optional) Record 10-30 sec ambient sounds
   ↓
AI analyzes → Generates scent description
   ↓
User reviews/edits description + adds tags
   ↓
"Save Memory" → Saved to permanent storage
   ↓
Tap any memory → Choose Ritual or Focus mode
   ↓
Ritual Mode: Placement → Served → Take Bite → Completion (with fireworks!)
Focus Mode: Zoom, pan, examine details
   ↓
View stats, badges, and streaks
```

## 🎨 Design Philosophy

### Color Palette

- **Primary:** Warm Orange (#FF8C42)
- **Secondary:** Light Orange (#FFB84D)
- **Background:** Cream (#FFF8F0)
- **Accent:** Soft Coral (#E8835C)
- **Brown:** Soft Brown (#8B6F47)

### UX Principles

- Warm, nostalgic atmosphere
- Smooth animations and transitions
- Haptic feedback for important actions
- Loading states with food-related messages
- Accessibility-first approach

## 📂 Project Structure

```
Odora/
├── App.js                      # Main navigation setup
├── screens/
│   ├── HomeScreen.js          # Memory library grid
│   ├── CaptureScreen.js       # Camera + audio recording
│   ├── DescriptionEditScreen.js # Edit AI description + tags
│   ├── ARViewScreen.js        # Ritual + Focus modes, gamification
│   └── PlaybackScreen.js      # Memory playback experience
├── services/
│   ├── aiService.js           # OpenAI GPT-4 Vision integration
│   ├── storageService.js      # AsyncStorage operations
│   ├── fileService.js         # Permanent image storage
│   └── ttsService.js          # Text-to-speech
├── constants/
│   └── theme.js               # Colors, typography, spacing
├── assets/                     # Icons, splash screen
├── package.json
└── README.md
```

## 🔑 Key Components

### CaptureScreen

- Camera integration with permissions
- Audio recording (max 30 seconds)
- Image picker for gallery uploads
- Haptic feedback on capture

### DescriptionEditScreen

- AI-generated description editing
- Tag selection (Breakfast, Mom's Cooking, Dinner, etc.)
- Save to permanent storage with image copy

### ARViewScreen (Ritual + Focus)

- **Ritual Mode:** 4-step immersive experience with animations
- **Focus Mode:** Zoom and pan for detailed inspection
- **Gamification:** Streaks, badges, firework celebrations
- Scrollable content for completion screen

### PlaybackScreen

- Memory overview with photo and audio
- Navigate to Ritual/Focus modes
- Star rating system

## 🎮 Gamification Details

### Achievement Badges

- 🍽️ **First Bite** — Complete 1 ritual
- 🌟 **3-Day Warmth** — 3-day streak
- 🔥 **7-Day Table Reunion** — 7-day streak
- 💝 **Memory Keeper** — 10 total rituals
- 👩‍🍳 **One Month with Mom's Cooking** — 30-day streak
- 👨‍🍳 **Home Chef** — 50 total rituals

### Streak Logic

- **Same day:** No increment
- **Consecutive day:** +1 to streak
- **Gap > 1 day:** Reset to 1

### Celebration Effects

- **Fireworks:** 3 bursts with 30 particles each, radial explosion pattern
- **Badge Popup:** Spring animation when new badge is earned
- **Persistent Display:** Streak badge visible during ritual mode

## 🌟 Future Enhancements

- [ ] Cloud sync across devices
- [ ] Share memory cards to social media
- [ ] Community memory sharing

## 🧪 Developer Notes

### Image Persistence

Images are copied to `FileSystem.documentDirectory` at save time to ensure they persist across app restarts. Temporary camera URIs expire, so the `fileService.js` handles permanent storage.

### Gamification Storage

AsyncStorage keys used:

- `ritual_streak` — Current consecutive days
- `total_rituals` — Lifetime ritual count
- `earned_badges` — Array of badge objects
- `last_ritual_date` — Date string for streak validation

### Known Issues

- **Missing images?** Ensure the capture → save flow completes and the device has storage permissions
- AI features require valid OpenAI API key and network access
- Local-first app — no cloud sync currently implemented

## 🤝 Contributing

This project was built for a hackathon and is open to contributions! Feel free to:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT-4 Vision API
- Expo team for the amazing framework
- All the homesick students who inspired this project

## 📞 Contact

Created by [@Minh111104](https://github.com/Minh111104)

**Made with ❤️ for homesick students everywhere**
