# 🌸 Odora – Multisensory Memory Capture

**Because sometimes, remembering how something smelled is just as powerful as smelling it again.**

Odora is a mobile app designed to help homesick students recreate scent memories through multisensory triggers. Using AI-generated descriptions, ambient sounds, and family voices, we bring students closer to home—one meal at a time.

## 🎯 The Problem

International students often miss the familiar scents of home-cooked meals. While we can't digitize smell (yet), Odora does something better: it helps your brain recreate smell memories through multisensory experiences.

## ✨ Features

### MVP Features (Phase 1)

- 📸 **Photo + Audio Recording**
  - Capture images of food
  - Record ambient cooking sounds (10-30 seconds)
- 🤖 **AI Scent Description Generator**

  - GPT-4 Vision API analyzes food photos
  - Generates vivid, sensory-rich descriptions
  - User can edit and personalize descriptions

- 🎭 **Memory Playback Mode**
  - Displays photos with warm, nostalgic filters
  - Plays cooking sounds on loop
  - Text-to-speech reads scent descriptions in a calming voice
- 👨‍👩‍👧 **Family Connection**

  - Family members can record their own descriptions
  - "Mom's voice describing Sunday dinner" beats AI every time

- 📊 **Scent Memory Journal**
  - Rate how well you "remembered" the smell (1-5 stars)
  - Track which sensory combinations work best
  - Build personal library of food memories

## 🛠️ Tech Stack

- **Frontend:** React Native (Expo)
- **AI:** OpenAI GPT-4 Vision API
- **Audio:** Expo AV (recording & playback)
- **Text-to-Speech:** Expo Speech
- **Storage:** AsyncStorage (local data persistence)
- **Navigation:** React Navigation
- **UI/UX:** Linear Gradients, Haptic Feedback, Smooth Animations

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
(Optional) Record 10-30 sec cooking sounds
   ↓
AI analyzes → Generates scent description
   ↓
User reviews/edits description + adds tags
   ↓
"Save Memory" → Added to library
   ↓
Tap any memory → Full playback experience
   ↓
Rate memory effectiveness (1-5 stars)
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
│   └── PlaybackScreen.js      # Immersive playback experience
├── services/
│   ├── aiService.js           # OpenAI GPT-4 Vision integration
│   └── storageService.js      # AsyncStorage operations
├── constants/
│   └── theme.js               # Colors, typography, spacing
├── assets/                     # Icons, splash screen
├── package.json
├── app.json
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
- Tag selection (Breakfast, Mom's Cooking, etc.)
- Save to local storage

### PlaybackScreen

- Immersive full-screen experience
- Warm photo filter overlay
- Looping ambient audio
- Text-to-speech with calming voice
- Star rating system

## 🌟 Future Enhancements (Phase 2+)

- [ ] Family invite system (collaborative descriptions)
- [ ] Share memory cards to social media
- [ ] Search and filter memories by tags
- [ ] Scent product recommendations (candles, incense)
- [ ] Cloud sync across devices
- [ ] Community memory sharing
- [ ] ML-based scent prediction improvements
- [ ] Voice-to-text for voice descriptions

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
