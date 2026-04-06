"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCustomVerificationEmail = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const resend_1 = require("resend");
admin.initializeApp();
const APP_URL = 'https://fastline-app--studio-3353968200-c57b0.asia-east1.hosted.app';
const REGION = 'asia-east1';
function getResend() {
    const key = process.env.RESEND_API_KEY;
    if (!key)
        throw new Error('RESEND_API_KEY not set');
    return new resend_1.Resend(key);
}
function buildVerificationEmail(opts) {
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
exports.sendCustomVerificationEmail = (0, https_1.onCall)({ region: REGION, secrets: ['RESEND_API_KEY'] }, async (request) => {
    var _a, _b, _c, _d, _e;
    const uid = (_a = request.data) === null || _a === void 0 ? void 0 : _a.uid;
    const lang = ((_b = request.data) === null || _b === void 0 ? void 0 : _b.lang) || 'ja';
    if (!uid)
        throw new https_1.HttpsError('invalid-argument', 'uid is required');
    // Only allow the authenticated user to request their own verification email
    if (!request.auth || request.auth.uid !== uid) {
        throw new https_1.HttpsError('permission-denied', 'Not authorized');
    }
    const userRecord = await admin.auth().getUser(uid);
    if (userRecord.emailVerified) {
        throw new https_1.HttpsError('failed-precondition', 'Email is already verified');
    }
    if (!userRecord.email) {
        throw new https_1.HttpsError('failed-precondition', 'User has no email address');
    }
    let verificationLink;
    try {
        verificationLink = await admin.auth().generateEmailVerificationLink(userRecord.email, { url: APP_URL });
    }
    catch (err) {
        if (((_c = err === null || err === void 0 ? void 0 : err.errorInfo) === null || _c === void 0 ? void 0 : _c.code) === 'auth/internal-error' && ((_d = err === null || err === void 0 ? void 0 : err.message) === null || _d === void 0 ? void 0 : _d.includes('TOO_MANY_ATTEMPTS'))) {
            throw new https_1.HttpsError('resource-exhausted', 'too-many-requests');
        }
        throw new https_1.HttpsError('internal', 'Failed to generate verification link');
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
        if (result.error.statusCode === 403) {
            throw new https_1.HttpsError('unavailable', 'resend-domain-not-verified');
        }
        console.error('Resend error:', result.error);
        throw new https_1.HttpsError('internal', 'Failed to send email');
    }
    return { success: true, emailId: (_e = result.data) === null || _e === void 0 ? void 0 : _e.id };
});
//# sourceMappingURL=index.js.map