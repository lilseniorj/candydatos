const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");

initializeApp();
const db = getFirestore();

// ─── OG Meta Tags for Job Previews ─────────────────────────────────────────
const BOT_USER_AGENTS = /whatsapp|telegrambot|twitterbot|facebookexternalhit|linkedinbot|slackbot|discordbot|pinterest|googlebot/i;

exports.jobOgMeta = onRequest(async (req, res) => {
  const ua = req.headers["user-agent"] || "";
  const pathParts = req.path.split("/").filter(Boolean); // ['jobs', 'jobId']
  const jobId = pathParts[1];

  const isBot = BOT_USER_AGENTS.test(ua);

  // Default meta
  let title = "candydatos — Oferta de trabajo";
  let description = "Aplica a esta oferta en candydatos, la plataforma de reclutamiento inteligente con IA.";
  let image = "https://candydatos.web.app/og-image.png";
  let url = `https://candydatos.web.app${req.path}`;
  let companyName = "candydatos";

  // Fetch job data from Firestore
  if (jobId) {
    try {
      const jobDoc = await db.collection("job_offers").doc(jobId).get();
      if (jobDoc.exists) {
        const job = jobDoc.data();
        title = `${job.title} — ${job.country || ""}`;
        const salary = job.max_salary > 0
          ? `$${(job.min_salary || 0).toLocaleString()}–$${job.max_salary.toLocaleString()}`
          : "";
        description = [
          job.work_modality || "",
          salary,
          job.description ? job.description.slice(0, 150) + "…" : "",
        ].filter(Boolean).join(" · ");

        // Fetch company name
        if (job.company_id) {
          const compDoc = await db.collection("companies").doc(job.company_id).get();
          if (compDoc.exists) {
            companyName = compDoc.data().commercial_name || "candydatos";
            if (compDoc.data().logo_url) image = compDoc.data().logo_url;
          }
        }
      }
    } catch (err) {
      console.error("Error fetching job for OG:", err);
    }
  }

  // Escape HTML entities in dynamic strings
  const esc = (s) => String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  const ogTags = `
  <meta property="og:type" content="website"/>
  <meta property="og:site_name" content="candydatos"/>
  <meta property="og:title" content="${esc(title)} | ${esc(companyName)}"/>
  <meta property="og:description" content="${esc(description)}"/>
  <meta property="og:image" content="${esc(image)}"/>
  <meta property="og:url" content="${esc(url)}"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${esc(title)} | ${esc(companyName)}"/>
  <meta name="twitter:description" content="${esc(description)}"/>
  <meta name="twitter:image" content="${esc(image)}"/>`;

  if (isBot) {
    // Bots get minimal HTML with OG tags
    res.set("Cache-Control", "public, max-age=300, s-maxage=600");
    res.status(200).send(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>${esc(title)} | ${esc(companyName)}</title><meta name="description" content="${esc(description)}"/>${ogTags}</head><body><h1>${esc(title)}</h1><p>${esc(description)}</p><a href="${esc(url)}">Ver oferta</a></body></html>`);
  } else {
    // Regular users get redirected to the SPA
    res.redirect(301, url);
  }
});

exports.onMailCreated = onDocumentCreated(
  { document: "mail/{mailId}", secrets: ["GMAIL_EMAIL", "GMAIL_APP_PASSWORD"] },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      console.log("No data in event");
      return;
    }

    const data = snap.data();
    const { to, message } = data;

    console.log(">>> New mail document:", snap.id);
    console.log(">>> To:", to);
    console.log(">>> Subject:", message?.subject || "(no subject)");

    if (!to || !message?.html) {
      console.error(">>> Missing 'to' or 'message.html'");
      await snap.ref.update({ status: "error", error: "Missing 'to' or 'message.html'" });
      return;
    }

    const gmailEmail = process.env.GMAIL_EMAIL;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    console.log(">>> GMAIL_EMAIL loaded:", gmailEmail ? "yes" : "NO");
    console.log(">>> GMAIL_APP_PASSWORD loaded:", gmailPass ? `yes (${gmailPass.length} chars)` : "NO");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailEmail,
        pass: gmailPass,
      },
    });

    try {
      const info = await transporter.sendMail({
        from: `candydatos <${gmailEmail}>`,
        to,
        subject: message.subject || "Notificación de candydatos",
        html: message.html,
      });

      console.log(">>> EMAIL SENT OK to", to, "| messageId:", info.messageId);
      await snap.ref.update({ status: "sent", sent_at: new Date() });
    } catch (err) {
      console.error(">>> EMAIL FAILED:", err.message);
      console.error(">>> Error code:", err.code);
      await snap.ref.update({ status: "error", error: err.message });
    }
  }
);
