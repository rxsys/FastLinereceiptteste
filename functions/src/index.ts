import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { Resend } from 'resend';

admin.initializeApp();

const APP_URL = 'https://fastline-app--studio-3353968200-c57b0.asia-east1.hosted.app';
const REGION = 'asia-east1';

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  return new Resend(key);
}

function buildVerificationEmail(opts: {
  displayName: string;
  verificationLink: string;
  lang: string;
}): { subject: string; html: string } {
  const isJa = opts.lang === 'ja';

  const subject = isJa
    ? 'FastLine メールアドレスの確認'
    : 'FastLine – Verify your email address';

  const title = isJa ? 'メールアドレスの確認' : 'Verify your email';
  const greeting = isJa
    ? `${opts.displayName} 様、FastLine へようこそ！`
    : `Welcome to FastLine, ${opts.displayName}!`;
  const body = isJa
    ? '下のボタンをクリックして、メールアドレスの確認を完了してください。'
    : 'Click the button below to confirm your email address.';
  const btnLabel = isJa ? 'メールアドレスを確認する' : 'Verify email address';
  const ignore = isJa
    ? 'このメールに心当たりがない場合は無視してください。リンクは24時間有効です。'
    : "If you didn't create an account, you can safely ignore this email. The link expires in 24 hours.";
  const footer = isJa ? 'FastLine チームより' : 'The FastLine Team';

  const html = `<!DOCTYPE html>
<html lang="${opts.lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#0c0c14;padding:28px 40px;">
              <span style="font-size:22px;font-weight:900;color:#ff6b35;letter-spacing:-0.5px;">F</span>
              <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">astLine</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 20px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111111;">${title}</h1>
              <p style="margin:0 0 16px;font-size:15px;color:#444444;">${greeting}</p>
              <p style="margin:0 0 32px;font-size:14px;color:#666666;line-height:1.6;">${body}</p>

              <!-- Button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:10px;background:#ff6b35;">
                    <a href="${opts.verificationLink}"
                       style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:0.2px;">
                      ${btnLabel}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:32px 0 0;font-size:12px;color:#aaaaaa;line-height:1.6;">${ignore}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#aaaaaa;">${footer}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

// ── Callable: send (or resend) a custom verification email ───────────────────
export const sendCustomVerificationEmail = onCall(
  { region: REGION, secrets: ['RESEND_API_KEY'] },
  async (request) => {
    const uid: string = request.data?.uid;
    const lang: string = request.data?.lang || 'ja';

    if (!uid) throw new HttpsError('invalid-argument', 'uid is required');

    // Only allow the authenticated user to request their own verification email
    if (!request.auth || request.auth.uid !== uid) {
      throw new HttpsError('permission-denied', 'Not authorized');
    }

    const userRecord = await admin.auth().getUser(uid);

    if (userRecord.emailVerified) {
      throw new HttpsError('failed-precondition', 'Email is already verified');
    }

    if (!userRecord.email) {
      throw new HttpsError('failed-precondition', 'User has no email address');
    }

    let verificationLink: string;
    try {
      verificationLink = await admin.auth().generateEmailVerificationLink(
        userRecord.email,
        { url: APP_URL }
      );
    } catch (err: any) {
      if (err?.errorInfo?.code === 'auth/internal-error' && err?.message?.includes('TOO_MANY_ATTEMPTS')) {
        throw new HttpsError('resource-exhausted', 'too-many-requests');
      }
      throw new HttpsError('internal', 'Failed to generate verification link');
    }

    const displayName = userRecord.displayName || userRecord.email;
    const { subject, html } = buildVerificationEmail({ displayName, verificationLink, lang });

    const resend = getResend();
    const fromAddress = process.env.RESEND_FROM_ADDRESS || 'FastLine <onboarding@resend.dev>';

    const result = await resend.emails.send({
      from: fromAddress,
      to: userRecord.email,
      subject,
      html,
    });

    if (result.error) {
      // 403 = domain not verified yet — signal client to fall back to Firebase SDK
      if ((result.error as any).statusCode === 403) {
        throw new HttpsError('unavailable', 'resend-domain-not-verified');
      }
      console.error('Resend error:', result.error);
      throw new HttpsError('internal', 'Failed to send email');
    }

    return { success: true, emailId: result.data?.id };
  }
);
