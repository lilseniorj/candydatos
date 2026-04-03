import {
  collection, doc, addDoc, updateDoc, getDocs, query, where, orderBy, limit,
  serverTimestamp, onSnapshot, writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase/config'

// ─── In-App Notifications ───────────────────────────────────────────────────

/**
 * Create an in-app notification for a candidate.
 */
export async function createNotification(candidateId, data) {
  return addDoc(collection(db, 'notifications'), {
    candidate_id: candidateId,
    type: data.type,       // 'status_change' | 'feedback' | 'hired' | 'rejected'
    title: data.title,
    body: data.body,
    job_title: data.jobTitle || '',
    job_id: data.jobId || '',
    app_id: data.appId || '',
    read: false,
    created_at: serverTimestamp(),
  })
}

/**
 * Subscribe to real-time notifications for a candidate.
 * Returns an unsubscribe function.
 */
export function subscribeToNotifications(candidateId, callback) {
  const q = query(
    collection(db, 'notifications'),
    where('candidate_id', '==', candidateId),
    orderBy('created_at', 'desc'),
    limit(50),
  )
  return onSnapshot(q,
    (snap) => {
      const notifications = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      callback(notifications)
    },
    (error) => {
      console.warn('[Notifications] Listener error (index may be building):', error.message)
      callback([])
    },
  )
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId) {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true })
}

/**
 * Mark all unread notifications as read for a candidate.
 */
export async function markAllAsRead(candidateId) {
  const q = query(
    collection(db, 'notifications'),
    where('candidate_id', '==', candidateId),
    where('read', '==', false),
  )
  const snap = await getDocs(q)
  if (snap.empty) return
  const batch = writeBatch(db)
  snap.docs.forEach(d => batch.update(d.ref, { read: true }))
  await batch.commit()
}

// ─── Email Notifications ────────────────────────────────────────────────────

/**
 * Queue a rejection notification email.
 * Stores in 'mail' collection — compatible with Firebase "Trigger Email" extension.
 * If the extension is not installed, the document is stored for future processing.
 */
/**
 * Queue an invitation email when a company invites someone to join.
 */
export async function sendInvitationEmail({ email, companyName, role, invitedByName }) {
  const roleLabel = role === 'admin' ? 'Administrador' : 'Reclutador'

  await addDoc(collection(db, 'mail'), {
    to: email,
    message: {
      subject: `Te han invitado a unirte a ${companyName} en candydatos`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: #3D7FC3; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">candydatos</h1>
          </div>
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #1e293b;">¡Hola!</p>
            <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
              <strong>${invitedByName}</strong> te ha invitado a unirte al equipo de <strong>${companyName}</strong> en candydatos como <strong>${roleLabel}</strong>.
            </p>
            <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
              Para aceptar la invitación, crea tu cuenta o inicia sesión con este correo electrónico.
            </p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://candydatos.web.app/company/register"
                style="background: #3D7FC3; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
                Aceptar invitación
              </a>
            </div>
            <p style="font-size: 13px; color: #94a3b8; margin-top: 20px; line-height: 1.5;">
              Si ya tienes una cuenta, simplemente inicia sesión con <strong>${email}</strong> y la invitación se aplicará automáticamente.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">
              Esta invitación expira en 7 días. Si no esperabas este correo, puedes ignorarlo.
            </p>
          </div>
        </div>
      `,
    },
    created_at: serverTimestamp(),
    type: 'invitation',
    status: 'pending',
    metadata: { email, companyName, role },
  })
}

/**
 * Queue a pipeline stage change notification email.
 */
export async function sendPipelineEmail({ candidateEmail, candidateName, jobTitle, companyName, newStage }) {
  const firstName = candidateName?.split(' ')[0] || 'Candidato'

  const stageInfo = {
    reviewing:  { label: 'En revisión',     color: '#3B82F6', icon: '👁',  message: 'Tu aplicación está siendo revisada por el equipo de reclutamiento.' },
    interview:  { label: 'Entrevista',       color: '#8B5CF6', icon: '🎤', message: '¡Felicidades! Has avanzado a la etapa de entrevista. El equipo se pondrá en contacto contigo pronto para agendar.' },
    technical:  { label: 'Prueba técnica',   color: '#F59E0B', icon: '💻', message: 'Has avanzado a la etapa de prueba técnica. Recibirás instrucciones próximamente.' },
    offer:      { label: 'Oferta',           color: '#10B981', icon: '📝', message: '¡Excelente noticia! La empresa quiere hacerte una oferta laboral. Pronto recibirás los detalles.' },
    hired:      { label: 'Contratado',       color: '#059669', icon: '✅', message: '¡Felicidades! Has sido contratado. Bienvenido al equipo.' },
  }

  const info = stageInfo[newStage]
  if (!info) return

  await addDoc(collection(db, 'mail'), {
    to: candidateEmail,
    message: {
      subject: `Tu aplicación a ${jobTitle} avanzó a: ${info.label} — ${companyName}`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: #3D7FC3; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">candydatos</h1>
          </div>
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #1e293b;">Hola <strong>${firstName}</strong>,</p>
            <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
              Tu aplicación a <strong>${jobTitle}</strong> en <strong>${companyName}</strong> ha cambiado de estado.
            </p>
            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
              <span style="font-size: 36px;">${info.icon}</span>
              <p style="font-size: 18px; font-weight: 700; color: ${info.color}; margin: 8px 0 4px 0;">${info.label}</p>
            </div>
            <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
              ${info.message}
            </p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://candydatos.web.app/candidate/applications"
                style="background: #3D7FC3; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
                Ver mis aplicaciones
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">
              Este correo fue enviado por candydatos. Si tienes preguntas, contacta a ${companyName}.
            </p>
          </div>
        </div>
      `,
    },
    created_at: serverTimestamp(),
    type: 'pipeline_update',
    status: 'pending',
    metadata: { candidateEmail, candidateName, jobTitle, companyName, newStage },
  })
}

export async function sendRejectionEmail({ candidateEmail, candidateName, jobTitle, companyName, feedback }) {
  const firstName = candidateName?.split(' ')[0] || 'Candidato'

  await addDoc(collection(db, 'mail'), {
    to: candidateEmail,
    message: {
      subject: `Actualización sobre tu aplicación a ${jobTitle} — ${companyName}`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: #3D7FC3; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">candydatos</h1>
          </div>
          <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #1e293b;">Hola <strong>${firstName}</strong>,</p>
            <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
              Queremos agradecerte por tu interés en la posición de <strong>${jobTitle}</strong> en <strong>${companyName}</strong>.
            </p>
            <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
              Después de una revisión cuidadosa, hemos decidido continuar con otros candidatos para esta posición.
            </p>
            ${feedback ? `
              <div style="background: #f1f5f9; border-left: 4px solid #3D7FC3; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="font-size: 13px; color: #334155; margin: 0; font-weight: 600;">Comentario del reclutador:</p>
                <p style="font-size: 13px; color: #64748b; margin: 8px 0 0 0; line-height: 1.5;">${feedback}</p>
              </div>
            ` : ''}
            <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
              Te animamos a seguir aplicando a otras ofertas en nuestra plataforma. ¡Tu perfil tiene potencial!
            </p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://candydatos.web.app/candidate/jobs"
                style="background: #3D7FC3; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
                Ver otras ofertas
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">
              Este correo fue enviado por candydatos. Si tienes preguntas, contacta a ${companyName}.
            </p>
          </div>
        </div>
      `,
    },
    created_at: serverTimestamp(),
    type: 'rejection',
    status: 'pending',
    metadata: { candidateEmail, candidateName, jobTitle, companyName },
  })
}
