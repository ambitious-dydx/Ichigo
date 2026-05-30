import nodemailer from "nodemailer";

type DeliveryMode = "smtp" | "local";

type SendTransactionalEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  previewUrl?: string;
  previewCode?: string;
};

export type EmailDeliveryResult = {
  delivery: DeliveryMode;
  previewUrl: string | null;
  previewCode: string | null;
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

function isGmailHost(host: string) {
  const normalized = host.trim().toLowerCase();
  return normalized === "smtp.gmail.com" || normalized === "smtp-relay.gmail.com";
}

function getSmtpConfig(): SmtpConfig | null {
  if (isSmtpDisabled()) {
    return null;
  }

  const user = getEnv("SMTP_USER");
  const rawPass = getEnv("SMTP_PASS");

  if (!user || !rawPass) {
    return null;
  }

  const host = getEnv("SMTP_HOST") || "smtp.gmail.com";
  const portRaw = getEnv("SMTP_PORT") || "465";
  const pass = isGmailHost(host) ? rawPass.replace(/\s+/g, "") : rawPass;
  const rawFrom = getEnv("SMTP_FROM");
  const from =
    !rawFrom || (isGmailHost(host) && rawFrom.includes("your-email@gmail.com"))
      ? `Ichigo <${user}>`
      : rawFrom;

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
      previewCode: input.previewCode ?? null,
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
    previewCode: null,
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

function wrapVerificationCodeHtml(input: {
  username: string;
  verificationCode: string;
}) {
  return `
    <div style="margin:0;padding:32px 20px;background:#f7f5f2;font-family:Arial,sans-serif;color:#221c24;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6ddd7;border-radius:20px;padding:32px;">
        <p style="margin:0 0 16px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#f04d47;font-weight:700;">
          Ichigo
        </p>
        <h1 style="margin:0 0 16px;font-size:30px;line-height:1.1;color:#221c24;">Verify your email.</h1>
        <p style="margin:0 0 20px;font-size:16px;line-height:1.65;color:#5d5560;">
          Hi ${input.username}, enter this verification code in Ichigo to confirm this address.
        </p>
        <div style="margin:0 0 20px;padding:18px 20px;border:1px solid #f0d7d0;border-radius:18px;background:#fff7f5;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#a75b56;font-weight:700;">
            Verification code
          </p>
          <p style="margin:0;font-size:32px;letter-spacing:0.24em;font-weight:800;color:#221c24;">
            ${input.verificationCode}
          </p>
        </div>
        <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#6d6670;">
          Return to Ichigo and enter this code. If you did not request this, you can ignore this email.
        </p>
      </div>
    </div>
  `;
}

export async function sendVerificationEmail(input: {
  to: string;
  username: string;
  verificationCode: string;
}) {
  return sendTransactionalEmail({
    to: input.to,
    subject: "Verify your Ichigo email",
    text: [
      `Hi ${input.username},`,
      "",
      "Verify your Ichigo email address with this code:",
      input.verificationCode,
      "",
      "Return to Ichigo and enter it on the verification screen.",
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: wrapVerificationCodeHtml(input),
    previewCode: input.verificationCode,
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
