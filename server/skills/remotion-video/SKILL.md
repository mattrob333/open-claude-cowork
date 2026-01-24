---
name: Remotion Video
description: Create programmatic videos using Remotion framework
triggers:
  - "create video"
  - "remotion"
  - "animated video"
  - "video composition"
  - "programmatic video"
  - "make a video"
version: 1.0.0
author: remotion-dev
---

# Remotion Video Creation Skill

## Overview
Remotion is a framework for creating videos programmatically using React. This skill enables creating professional animated videos with code.

## Core Concepts

### Composition
A composition defines the video structure:
```tsx
import { Composition } from 'remotion';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MyVideo"
      component={MyVideo}
      durationInFrames={150}    // 5 seconds at 30fps
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
```

### Using Time
```tsx
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export const MyAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Animate opacity from 0 to 1 over first 30 frames
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Animate position
  const translateY = interpolate(frame, [0, 60], [100, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      Animated Content
    </div>
  );
};
```

### Sequences
Arrange content in time:
```tsx
import { Sequence, useVideoConfig } from 'remotion';

export const MyVideo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <>
      {/* Shows from frame 0 to 60 */}
      <Sequence from={0} durationInFrames={60}>
        <IntroScene />
      </Sequence>

      {/* Shows from frame 60 to 120 */}
      <Sequence from={60} durationInFrames={60}>
        <MainContent />
      </Sequence>

      {/* Shows from frame 120 onwards */}
      <Sequence from={120}>
        <OutroScene />
      </Sequence>
    </>
  );
};
```

## Animation Utilities

### interpolate
```tsx
import { interpolate, Easing } from 'remotion';

// Basic interpolation
const value = interpolate(frame, [0, 100], [0, 1]);

// With easing
const eased = interpolate(frame, [0, 100], [0, 1], {
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
});

// Multiple keyframes
const scale = interpolate(
  frame,
  [0, 30, 60, 90],
  [0, 1.2, 0.9, 1],
  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
);
```

### spring
```tsx
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

const MyComponent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: {
      damping: 10,
      stiffness: 100,
      mass: 1,
    },
  });

  return <div style={{ transform: `scale(${scale})` }}>Spring!</div>;
};
```

## Common Patterns

### Text Animation
```tsx
import { useCurrentFrame, interpolate } from 'remotion';

const AnimatedText: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const words = text.split(' ');

  return (
    <div style={{ display: 'flex', gap: '0.5em' }}>
      {words.map((word, i) => {
        const delay = i * 5;
        const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const y = interpolate(frame - delay, [0, 15], [20, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        return (
          <span
            key={i}
            style={{
              opacity,
              transform: `translateY(${y}px)`,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
```

### Video/Image Assets
```tsx
import { Img, Video, staticFile, Audio } from 'remotion';

// From public folder
<Img src={staticFile('logo.png')} />
<Video src={staticFile('background.mp4')} />
<Audio src={staticFile('music.mp3')} />

// From URL
<Img src="https://example.com/image.png" />
```

### Transitions
```tsx
import { TransitionSeries, linearTiming, fade } from '@remotion/transitions';

export const MyVideo: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={60}>
        <Scene1 />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 30 })}
      />
      <TransitionSeries.Sequence durationInFrames={60}>
        <Scene2 />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
```

## Project Structure

```
my-remotion-video/
├── src/
│   ├── Root.tsx           # Entry point, defines compositions
│   ├── Video.tsx          # Main video component
│   ├── components/
│   │   ├── Intro.tsx
│   │   ├── Scene.tsx
│   │   └── Outro.tsx
│   └── hooks/
│       └── useAnimation.ts
├── public/
│   ├── fonts/
│   ├── images/
│   └── audio/
├── remotion.config.ts
└── package.json
```

## Rendering

### Preview
```bash
npx remotion preview src/index.ts
```

### Render to MP4
```bash
npx remotion render src/index.ts MyVideo out/video.mp4
```

### Render Settings
```tsx
// remotion.config.ts
import { Config } from '@remotion/cli/config';

Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setCrf(18);
Config.setOverwriteOutput(true);
```

## Best Practices

1. **Performance**: Keep compositions under 60 seconds for preview performance
2. **TypeScript**: Always use TypeScript for type safety
3. **Interpolate**: Use `interpolate()` for smooth animations
4. **Extrapolation**: Always set `extrapolateLeft/Right: 'clamp'` to prevent unexpected values
5. **Sequences**: Use Sequences to organize timeline
6. **Static Files**: Put assets in `public/` and use `staticFile()`
7. **Fonts**: Load fonts using `@remotion/google-fonts` or local files
8. **Audio**: Use `<Audio>` component for synchronized sound

## Common Video Sizes

| Name | Resolution | Aspect | Use Case |
|------|------------|--------|----------|
| 1080p | 1920x1080 | 16:9 | YouTube, general |
| 4K | 3840x2160 | 16:9 | High quality |
| Instagram | 1080x1080 | 1:1 | Instagram feed |
| Stories | 1080x1920 | 9:16 | Instagram/TikTok |
| Twitter | 1280x720 | 16:9 | Twitter video |
