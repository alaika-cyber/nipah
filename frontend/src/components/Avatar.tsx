interface AvatarProps {
  isSpeaking: boolean;
  isThinking: boolean;
}

export default function Avatar({ isSpeaking, isThinking }: AvatarProps) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl transition-all duration-300 ${
          isSpeaking ? 'avatar-speaking ring-4 ring-indigo-400/50' : ''
        } ${isThinking ? 'opacity-70' : ''}`}
      >
        {/* Face */}
        <div className="relative">
          {/* Eyes */}
          <div className="flex gap-5 mb-3">
            <div
              className={`w-3 h-3 rounded-full bg-white transition-all ${
                isSpeaking ? 'animate-pulse' : ''
              }`}
            />
            <div
              className={`w-3 h-3 rounded-full bg-white transition-all ${
                isSpeaking ? 'animate-pulse' : ''
              }`}
            />
          </div>
          {/* Mouth */}
          <div className="flex justify-center">
            <div
              className={`bg-white/90 rounded-full transition-all duration-200 ${
                isSpeaking
                  ? 'w-6 h-4 animate-pulse'
                  : isThinking
                  ? 'w-4 h-1'
                  : 'w-5 h-2'
              }`}
            />
          </div>
        </div>

        {/* Glow effect when speaking */}
        {isSpeaking && (
          <div className="absolute inset-0 rounded-full bg-indigo-400/20 animate-ping" />
        )}
      </div>

      {/* Voice wave indicator */}
      {isSpeaking && (
        <div className="flex items-end gap-1 mt-3 h-7">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="voice-bar w-1.5 bg-indigo-400 rounded-full"
              style={{ height: '8px' }}
            />
          ))}
        </div>
      )}

      {/* Status text */}
      <p className="mt-2 text-sm text-gray-400">
        {isSpeaking ? 'Speaking...' : isThinking ? 'Thinking...' : 'NiVa — Nipah Virus Assistant'}
      </p>
    </div>
  );
}
