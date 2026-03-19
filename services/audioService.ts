/**
 * Audio Service — barrel re-export from audio/core.ts
 *
 * All audio functionality lives in services/audio/core.ts.
 * This file preserves the import path for all 14 consumers.
 * Future splits (alarm, sleep, preview, breath, alertness) will
 * add files to services/audio/ and update this barrel.
 */
export {
    // AudioContext management
    initAudioContext,
    disposeAudioService,
    // Alarm sounds
    playSomniaAlarm,
    playProgressiveAlarm,
    playAlarmBySound,
    stopAlarmSound,
    // Alarm preview
    playAlarmPreview,
    isPreviewPlaying,
    getCurrentPreviewId,
    toggleAlarmPreview,
    stopAlarmPreview,
    // Sleep sounds
    playSleepSound,
    stopSleepSound,
    setLiveVolume,
    setLiveBeatFrequency,
    isSleepSoundPlaying,
    setSleepSoundPersist,
    shouldPersistSleepSound,
    stopSleepSoundIfNotPersisting,
    getCurrentSleepSoundName,
    getCurrentSleepSoundVolume,
    getCurrentSleepSoundscape,
    didSoundEndNaturally,
    getLastPlayedSound,
    canRestartSound,
    restartLastSound,
    extendSleepSound,
    clearSoundEndedState,
    // Breathing exercises
    playBreathSound,
    // Alertness boost
    playAlertnessBoost,
    stopAlertnessBoost,
    isAlertnessBoostPlaying,
    setAlertnessVolume,
} from './audio/core';
