import nodemailer from "nodemailer";

type DeliveryMode = "smtp" | "local";

type SendTransactionalEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  previewUrl?: string;
};

export type EmailDeliveryResult = {
  delivery: DeliveryMode;
  previewUrl: string | null;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

let transporter: nodemailer.Transporter | null = null;

function getEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function isSmtpDisabled() {
  return getEnv("ICHIGO_DISABLE_SMTP") === "true" || getEnv("VITEST") === "true";
}

function getSmtpConfig(): SmtpConfig | null {
  if (isSmtpDisabled()) {
    return null;
  }

  const user = getEnv("SMTP_USER");
  const pass = getEnv("SMTP_PASS");

  if (!user || !pass) {
    return null;
  }

  const host = getEnv("SMTP_HOST") || "smtp.gmail.com";
  const portRaw = getEnv("SMTP_PORT") || "465";
  const from = getEnv("SMTP_FROM") || `Ichigo <${user}>`;

  const port = Number(portRaw);

  if (!Number.isFinite(port)) {
    return null;
  }

  const secure =
    getEnv("SMTP_SECURE") === "true" ||
    (!getEnv("SMTP_SECURE") && port === 465);

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
  };
}

export function getAppUrl() {
  const value =
    getEnv("APP_URL") ||
    getEnv("NEXT_PUBLIC_APP_URL") ||
    "http://localhost:3000";

  return value.replace(/\/+$/, "");
}

export function buildAppUrl(path: string) {
  const base = getAppUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${base}${normalizedPath}`;
}

function getTransporter(config: SmtpConfig) {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  return transporter;
}

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput,
): Promise<EmailDeliveryResult> {
  const config = getSmtpConfig();

  if (!config) {
    return {
      delivery: "local",
      previewUrl: input.previewUrl ?? null,
    };
  }

  const transport = getTransporter(config);

  await transport.sendMail({
    from: config.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  return {
    delivery: "smtp",
    previewUrl: null,
  };
}

function wrapEmailHtml(title: string, intro: string, ctaLabel: string, ctaUrl: string, outro: string) {
  return `
    <div style="margin:0;padding:32px 20px;background:#f7f5f2;font-family:Arial,sans-serif;color:#221c24;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6ddd7;border-radius:20px;padding:32px;">
        <p style="margin:0 0 16px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#f04d47;font-weight:700;">
          Ichigo
        </p>
        <h1 style="margin:0 0 16px;font-size:30px;line-height:1.1;color:#221c24;">${title}</h1>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:#5d5560;">${intro}</p>
        <a href="${ctaUrl}" style="display:inline-block;padding:14px 22px;border-radius:14px;background:#f04d47;color:#ffffff;text-decoration:none;font-weight:700;">
          ${ctaLabel}
        </a>
        <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#6d6670;">${outro}</p>
      </div>
    </div>
  `;
}

export async function sendVerificationEmail(input: {
  to: string;
  username: string;
  verificationUrl: string;
}) {
  return sendTransactionalEmail({
    to: input.to,
    subject: "Verify your Ichigo email",
    text: [
      `Hi ${input.username},`,
      "",
      "Verify your Ichigo email address by opening this link:",
      input.verificationUrl,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: wrapEmailHtml(
      "Verify your email.",
      `Hi ${input.username}, confirm this address so Ichigo can trust recovery and account ownership to reach you.`,
      "Verify email",
      input.verificationUrl,
      "If you did not request this, you can ignore this email.",
    ),
    previewUrl: input.verificationUrl,
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  username: string;
  resetUrl: string;
}) {
  return sendTransactionalEmail({
    to: input.to,
    subject: "Reset your Ichigo password",
    text: [
      `Hi ${input.username},`,
      "",
      "Reset your Ichigo password by opening this link:",
      input.resetUrl,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: wrapEmailHtml(
      "Reset your password.",
      `Hi ${input.username}, use the link below to choose a new password for your Ichigo account.`,
      "Reset password",
      input.resetUrl,
      "If you did not request this, you can ignore this email.",
    ),
    previewUrl: input.resetUrl,
  });
}
