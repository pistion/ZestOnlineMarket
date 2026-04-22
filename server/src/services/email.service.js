const path = require("path");

const ejs = require("ejs");
const nodemailer = require("nodemailer");

const { smtpFrom, smtpHost, smtpPass, smtpPort, smtpSecure, smtpUser } = require("../config/env");
const { logError, logInfo, logWarn } = require("../utils/logger");

let cachedTransport = null;

function isEmailEnabled() {
  return Boolean(smtpHost);
}

function getTransport() {
  if (!isEmailEnabled()) {
    return null;
  }

  if (cachedTransport) {
    return cachedTransport;
  }

  cachedTransport = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth:
      smtpUser || smtpPass
        ? {
            user: smtpUser || "",
            pass: smtpPass || "",
          }
        : undefined,
  });

  return cachedTransport;
}

async function renderTemplate(templateName, data = {}) {
  const filePath = path.join(__dirname, "..", "email-templates", `${templateName}.ejs`);
  return ejs.renderFile(filePath, data, {
    async: true,
  });
}

async function sendTemplateMail({ to, subject, template, data }) {
  if (!to) {
    logWarn("email.skip.no_recipient", {
      subject,
      template,
    });
    return {
      skipped: true,
      reason: "missing_recipient",
    };
  }

  const html = await renderTemplate(template, data);
  const transport = getTransport();
  if (!transport) {
    logInfo("email.skip.transport_disabled", {
      to,
      subject,
      template,
    });
    return {
      skipped: true,
      reason: "transport_disabled",
    };
  }

  try {
    const result = await transport.sendMail({
      from: smtpFrom,
      to,
      subject,
      html,
    });

    logInfo("email.sent", {
      to,
      subject,
      template,
      messageId: result && result.messageId ? result.messageId : "",
    });

    return {
      skipped: false,
      messageId: result && result.messageId ? result.messageId : "",
    };
  } catch (error) {
    logError("email.send_failed", {
      to,
      subject,
      template,
      error: error && error.message ? error.message : String(error),
    });

    return {
      skipped: true,
      reason: "send_failed",
    };
  }
}

module.exports = {
  sendTemplateMail,
};
