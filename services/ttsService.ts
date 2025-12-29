
export const speakText = (text: string, voiceName?: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop current speech

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    // Prefer a soothing/natural voice if available
    const preferredVoice = voices.find(v => v.name.includes("Samantha") || v.name.includes("Google US English")) || voices[0];

    utterance.voice = preferredVoice;
    utterance.rate = 0.9; // Slightly slower for calmness
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
};

export const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
};

export const getBriefingContent = (userName: string = "Dreamer"): string => {
    const hours = new Date().getHours();
    const greeting = hours < 12 ? "Good morning" : "Hello";
    return `${greeting}, ${userName}. I hope you slept well. Remember to log your dreams to keep your streak alive.`;
};
