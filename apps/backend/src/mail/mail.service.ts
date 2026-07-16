import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter?: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>("SMTP_HOST");
    const user = this.config.get<string>("SMTP_USER");
    const pass = this.config.get<string>("SMTP_PASS");
    this.from = this.config.get<string>("SMTP_FROM", user ?? "no-reply@phuottogether.local");

    // SMTP is optional in dev - if unconfigured, fall back to logging the
    // email instead of throwing, so the rest of the register/verify flow
    // stays testable without real credentials.
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>("SMTP_PORT", 587),
        secure: this.config.get<string>("SMTP_SECURE") === "true",
        auth: { user, pass }
      });
    }
  }

  async sendVerificationCode(to: string, code: string) {
    const subject = "Mã xác thực Phượt Together";
    const text = `Mã xác thực của bạn là: ${code}\n\nMã có hiệu lực trong 10 phút.`;

    if (!this.transporter) {
      this.logger.warn(`SMTP not configured - verification code for ${to}: ${code}`);
      return;
    }

    await this.transporter.sendMail({ from: this.from, to, subject, text });
  }
}
