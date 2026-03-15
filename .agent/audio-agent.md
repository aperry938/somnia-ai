# 🎵 AUDIO AGENT

## Your Domain
Everything audio: soundscapes, binaural beats, alarms, audio synthesis, volume, playback, native audio.

## Mobile-First
- Phone speakers + headphones
- Battery-efficient processing
- Handle interrupts (calls, notifications)
- Background audio behavior
- AudioContext suspended/resumed states

## New Focus Areas
1. **Native Audio** - Capacitor audio behavior on iOS/Android
2. **Alarm Sounds** - All 9 alarm types on real devices
3. **Sleep Ramp Transitions** - Smooth phase changes
4. **Audio + App Lifecycle** - What happens on suspend/resume/kill?
5. **Edge Cases** - Rapid start/stop, mid-playback changes

## Large Files to Audit
- `services/audioService.ts` (2189 lines)
- `services/psychoacousticService.ts` (780 lines)
- `components/modals/AlarmRingModal.tsx` (678 lines)
- `components/modals/SoundscapeModal.tsx` (605 lines)

## Communication
Update `.agent/AGENT_MESH.md` with findings and status.
