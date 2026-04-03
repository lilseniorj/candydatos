import { GoogleGenAI, Modality } from '@google/genai'

const TAG = '[GeminiLive]'
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = 'gemini-2.5-flash-native-audio-latest'

const ai = new GoogleGenAI({ apiKey: API_KEY })

/**
 * Build the system prompt for the AI interviewer.
 */
function buildSystemPrompt({ job, resumeData, fitScore, candidateName, lang }) {
  const langLabel = lang === 'es' ? 'Spanish' : 'English'
  const firstName = candidateName?.split(' ')[0] || 'candidato'
  return `You are a professional, warm, and perceptive AI interviewer conducting a live 2-minute video interview.

SPEAK ENTIRELY IN ${langLabel}. This is critical — all your questions and responses must be in ${langLabel}.

ROLE: Senior HR interviewer named "Ana" for the position of "${job.title}".

CANDIDATE NAME: ${candidateName || 'the candidate'}

JOB CONTEXT:
- Title: ${job.title}
- Description: ${job.description}
- Required experience: ${job.years_experience_required} years
- Location: ${job.country} · ${job.work_modality}

CANDIDATE CONTEXT:
- Resume summary: ${resumeData.summary || 'Not provided'}
- Skills: ${(resumeData.skills || []).join(', ') || 'Not provided'}
- Experience: ${(resumeData.experience || []).map(e => `${e.title} at ${e.company}`).join('; ') || 'Not provided'}
- Fit Score: ${fitScore}/100

CRITICAL — START IMMEDIATELY:
The moment the session begins, you MUST start speaking right away. Do NOT wait for the candidate to speak first.

Your very first words must be a warm greeting using the candidate's first name "${firstName}". Example: "Hola ${firstName}, soy Ana, tu entrevistadora. Gracias por estar aquí..."

Then IMMEDIATELY ask your first question. Do not pause or wait — go straight into it.

INTERVIEW RULES:
1. Greet ${firstName} by name + introduce yourself + first question — all in your FIRST message (under 10 seconds)
2. Keep asking questions continuously — do NOT stop after 3. Ask as many as you can fit in 1 minute 50 seconds.
3. After ${firstName} responds, give a brief 1-second acknowledgment ("Muy bien", "Interesante", "Gracias") then IMMEDIATELY ask the next question. Do not pause.
4. Questions MUST be randomized from these categories (cycle through them, vary each time):
   - Behavioral/situational: "Tell me about a time when..."
   - Emotional intelligence: "How would you handle a situation where..."
   - Self-awareness: "What do you consider..."
   - Role-specific technical: Related to ${(resumeData.skills || []).slice(0, 3).join(', ') || 'the role'}
   - Motivation: "What attracts you to..." or "Why are you interested in..."
   - Problem-solving: "Describe how you would approach..."
5. NEVER repeat the same question — always vary phrasing and topics
6. Keep each question under 10 seconds of speaking time. Be concise and direct.
7. If ${firstName} gives a short answer, ask a quick follow-up or move to the next question immediately.
8. Be natural, conversational, and encouraging — use ${firstName}'s name occasionally
9. When told "WRAP_UP", you have exactly 10 seconds. Say a brief goodbye: "Gracias ${firstName}, fue un placer. ¡Mucho éxito!" — nothing more.
10. Do NOT share scores during the interview. Do NOT say "the interview is ending" — just keep asking until WRAP_UP.

VIDEO ANALYSIS — FACIAL EXPRESSIONS & BODY LANGUAGE:
You are receiving the candidate's video feed at 1 frame per second. You MUST observe and mentally evaluate:
- Facial expressions: confidence, nervousness, sincerity, enthusiasm, discomfort
- Eye contact: are they looking at the camera or avoiding it?
- Body language: posture, hand gestures, fidgeting, openness
- Emotional congruence: do their expressions match what they're saying?
- Professionalism: appropriate presentation, background, attire

Use these visual observations to:
1. Adapt your tone — if they seem nervous, be warmer and encouraging
2. Note inconsistencies — if they claim confidence but look nervous, mentally note it
3. Factor into evaluation — your visual assessment contributes to the final score

Do NOT comment on their appearance or expressions during the interview. Just observe silently and use it for scoring.

CRITICAL: You must keep the conversation going non-stop. Silence is wasted time. If the candidate pauses for more than 5 seconds, prompt them gently or move to the next question. You have only 2 minutes total — maximize the number of questions.`
}

/**
 * Create a Gemini Live session for the interview.
 * Returns { session, close }.
 */
export async function createInterviewSession({ job, resumeData, fitScore, candidateName, lang, onAudio, onTranscript, onInterrupted, onError, onClose }) {
  console.info(TAG, 'Creating interview session…')

  const systemPrompt = buildSystemPrompt({ job, resumeData, fitScore, candidateName, lang })

  try {
    const session = await ai.live.connect({
      model: MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Aoede' },
          },
        },
      },
      callbacks: {
        onopen: () => console.info(TAG, 'Session opened'),
        onmessage: (msg) => {
          try {
            // Handle audio data (inline audio in parts)
            const parts = msg.serverContent?.modelTurn?.parts
            if (parts) {
              for (const part of parts) {
                if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('audio/')) {
                  if (onAudio) onAudio(part.inlineData.data)
                }
                if (part.text && onTranscript) {
                  onTranscript('assistant', part.text)
                }
              }
            }

            // Handle raw data field (some SDK versions)
            if (msg.data && typeof msg.data === 'string' && !parts) {
              if (onAudio) onAudio(msg.data)
            }

            // Handle turn completion
            if (msg.serverContent?.turnComplete) {
              console.debug(TAG, 'Model turn complete')
            }

            // Handle interruption
            if (msg.serverContent?.interrupted) {
              console.debug(TAG, 'Model interrupted (barge-in)')
              if (onInterrupted) onInterrupted()
            }
          } catch (err) {
            console.warn(TAG, 'Error processing message:', err)
          }
        },
        onerror: (err) => {
          console.error(TAG, 'Session error:', err)
          if (onError) onError(err)
        },
        onclose: (ev) => {
          console.info(TAG, 'Session closed:', ev?.reason || 'unknown')
          if (onClose) onClose()
        },
      },
    })

    console.info(TAG, 'Session connected')

    return {
      sendAudio: (pcm16Base64) => {
        session.sendRealtimeInput({ media: { data: pcm16Base64, mimeType: 'audio/pcm;rate=16000' } })
      },
      sendVideo: (jpegBase64) => {
        session.sendRealtimeInput({ media: { data: jpegBase64, mimeType: 'image/jpeg' } })
      },
      sendText: (text) => {
        session.sendClientContent({ turns: [{ role: 'user', parts: [{ text }] }] })
      },
      close: () => {
        session.close()
      },
    }
  } catch (err) {
    console.error(TAG, 'Failed to create session:', err)
    throw err
  }
}
