import nodemailer from "nodemailer";
export function mailReady(env = process.env) {
  return Boolean(
    env.SMTP_HOST &&
    env.SMTP_FROM &&
    env.PUBLIC_URL &&
    env.SMTP_USER &&
    env.SMTP_PASS,
  );
}
export function createMailer(env = process.env) {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_PORT === "465",
    requireTLS: env.SMTP_PORT !== "465",
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 15000,
    socketTimeout: 30000,
  });
}
export function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
