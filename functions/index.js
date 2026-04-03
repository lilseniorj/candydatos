const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");

initializeApp();
const db = getFirestore();

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
