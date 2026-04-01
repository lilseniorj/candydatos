import { GoogleGenAI, Modality } from '@google/genai'

const TAG = '[GeminiLive]'
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = 'gemini-2.5-flash-native-audio-latest'

const ai = new GoogleGenAI({ apiKey: API_KEY })

/**
 * Build the system prompt for the AI interviewer.
 */
function buildSystemPrompt({ job, resumeData, fitScore, lang }) {
  const langLabel = lang === 'es' ? 'Spanish' : 'English'
  return `You are a professional, warm, and perceptive AI interviewer conducting a live 2-minute video interview.

SPEAK ENTIRELY IN ${langLabel}. This is critical — all your questions and responses must be in ${langLabel}.

ROLE: Senior HR interviewer for the position of "${job.title}" at a technology company.

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

INTERVIEW RULES:
1. Start with a brief warm greeting (5 seconds max), introduce yourself as the AI interviewer
2. Ask exactly 3 questions, one at a time, waiting for the candidate's full response before asking the next
3. Questions MUST be randomized from these categories (pick 3, vary the order each time):
   - Behavioral/situational: "Tell me about a time when..."
   - Emotional intelligence: "How would you handle a situation where..."
   - Self-awareness: "What do you consider..."
   - Role-specific technical: Related to ${(resumeData.skills || []).slice(0, 3).join(', ') || 'the role'}
   - Motivation: "What attracts you to..." or "Why are you interested in..."
   - Problem-solving: "Describe how you would approach..."
4. NEVER repeat the same question across interviews — always vary phrasing and topics
5. Keep each question under 15 seconds of speaking time
6. After the candidate responds, give a brief acknowledgment (2-3 seconds) before the next question
7. Be natural, conversational, and encouraging — not robotic
8. When told "WRAP_UP", deliver a brief thank-you closing (5 seconds)
9. Evaluate the candidate mentally but do NOT share scores during the interview

IMPORTANT: You have only 2 minutes total. Be concise and efficient with time.`
}

/**
 * Create a Gemini Live session for the interview.
 * Returns { session, close }.
 */
export async function createInterviewSession({ job, resumeData, fitScore, lang, onAudio, onTranscript, onInterrupted, onError, onClose }) {
  console.info(TAG, 'Creating interview session…')

  const systemPrompt = buildSystemPrompt({ job, resumeData, fitScore, lang })

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
