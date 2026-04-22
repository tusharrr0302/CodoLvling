import { useState, useCallback } from 'react';

export const useVoiceChat = (socket, roomId, userId, peerUserIds) => {
  const [isMuted, setIsMuted] = useState(true);
  const [speakingStates, setSpeakingStates] = useState({});
  const [voiceError, setVoiceError] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState({});

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const startVoice = useCallback(() => {
    setVoiceEnabled(true);
  }, []);

  return {
    isMuted,
    toggleMute,
    speakingStates,
    voiceError,
    voiceEnabled,
    startVoice,
    remoteStreams
  };
};
