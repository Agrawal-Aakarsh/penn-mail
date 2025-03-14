import express, { Request, Response, Router } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ParamsDictionary } from 'express-serve-static-core';

dotenv.config();

const app = express();
const router = Router();

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

const PORT = process.env.PORT || 3001;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
}

interface SendEmailRequest {
  to: string;
  subject: string;
  content: string;
}

// Gmail API helper functions
const decodeBase64Url = (input: string): string => {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = input.length % 4;
  if (pad) {
    input += new Array(5 - pad).join('=');
  }
  return Buffer.from(input, 'base64').toString('utf-8');
};

const getGmailClient = (accessToken: string) => {
  const auth = new OAuth2Client();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth });
};

// Debug helper
const logMessageStructure = (message: any) => {
  console.log('\n=== Email Debug Info ===');
  console.log('Subject:', message.payload?.headers?.find((h: any) => h.name === 'Subject')?.value);
  console.log('Payload MimeType:', message.payload?.mimeType);
  console.log('Has Body Data:', !!message.payload?.body?.data);
  console.log('Parts Length:', message.payload?.parts?.length);
  if (message.payload?.parts) {
    message.payload.parts.forEach((part: any, index: number) => {
      console.log(`\nPart ${index}:`);
      console.log('- MimeType:', part.mimeType);
      console.log('- Has Body Data:', !!part.body?.data);
      console.log('- Has Parts:', !!part.parts);
      console.log('- Filename:', part.filename);
      if (part.parts) {
        part.parts.forEach((subPart: any, subIndex: number) => {
          console.log(`  SubPart ${subIndex}:`);
          console.log('  - MimeType:', subPart.mimeType);
          console.log('  - Has Body Data:', !!subPart.body?.data);
        });
      }
    });
  }
  console.log('======================\n');
};

const getMessageBody = (payload: any): string => {
  if (!payload) {
    console.log('No payload provided to getMessageBody');
    return '';
  }

  // For multipart messages
  if (payload.mimeType?.startsWith('multipart/')) {
    console.log('Processing multipart message');
    if (!payload.parts) {
      console.log('No parts found in multipart message');
      return '';
    }

    // First try to find an HTML part at any level
    const findHtmlPart = (parts: any[]): any => {
      for (const part of parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          return part;
        }
        if (part.parts) {
          const htmlPart = findHtmlPart(part.parts);
          if (htmlPart) return htmlPart;
        }
      }
      return null;
    };

    const htmlPart = findHtmlPart(payload.parts);
    if (htmlPart) {
      console.log('Found HTML part');
      return decodeBase64Url(htmlPart.body.data);
    }

    // If no HTML, look for text/plain
    const findTextPart = (parts: any[]): any => {
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return part;
        }
        if (part.parts) {
          const textPart = findTextPart(part.parts);
          if (textPart) return textPart;
        }
      }
      return null;
    };

    const textPart = findTextPart(payload.parts);
    if (textPart) {
      console.log('Found text part');
      const text = decodeBase64Url(textPart.body.data);
      return text.replace(/\n/g, '<br>');
    }
  }

  // For single part messages
  if (payload.body?.data) {
    console.log('Processing single part message:', payload.mimeType);
    if (payload.mimeType === 'text/html') {
      return decodeBase64Url(payload.body.data);
    }
    if (payload.mimeType === 'text/plain') {
      const text = decodeBase64Url(payload.body.data);
      return text.replace(/\n/g, '<br>');
    }
  }

  console.log('No suitable content found in message');
  return '';
};

// API Routes
router.get('/emails', (req: Request, res: Response) => {
  (async () => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const accessToken = authHeader.split(' ')[1];
      const gmail = getGmailClient(accessToken);

      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 20,
      });

      const messages = response.data.messages || [];
      const emailPromises = messages.map(async (msg) => {
        try {
          console.log('\nFetching email:', msg.id);
          const emailData = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'full',
          });

          const message = emailData.data;
          const headers = message.payload?.headers;
          
          if (!headers) {
            console.log('No headers found in message');
            return null;
          }

          const subject = headers.find(h => h.name === 'Subject')?.value || '(no subject)';
          const from = headers.find(h => h.name === 'From')?.value || '';
          const to = headers.find(h => h.name === 'To')?.value || '';
          const date = headers.find(h => h.name === 'Date')?.value || '';

          // Log message structure for debugging
          logMessageStructure(message);

          const body = message.payload ? getMessageBody(message.payload) : '';
          console.log('Extracted body length:', body.length);
          if (body.length > 0) {
            console.log('Body preview:', body.substring(0, 200));
          } else {
            console.log('No body content extracted');
          }

          return {
            id: message.id || '',
            threadId: message.threadId || '',
            subject,
            from,
            to,
            date,
            snippet: message.snippet || '',
            body: body || message.snippet || '',
          };
        } catch (error) {
          console.error('Error fetching email content:', error);
          return null;
        }
      });

      const emails = (await Promise.all(emailPromises)).filter((email): email is EmailMessage => {
        return email !== null && typeof email.body === 'string';
      });
      
      console.log(`Successfully processed ${emails.length} emails`);
      res.json(emails);
    } catch (error) {
      console.error('Error fetching emails:', error);
      res.status(500).json({ error: 'Failed to fetch emails' });
    }
  })();
});

router.post('/emails/send', (req: Request, res: Response) => {
  (async () => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const accessToken = authHeader.split(' ')[1];
      const { to, subject, content } = req.body;
      const gmail = getGmailClient(accessToken);

      const message = [
        'Content-Type: text/plain; charset="UTF-8"\n',
        'MIME-Version: 1.0\n',
        'Content-Transfer-Encoding: 7bit\n',
        `To: ${to}\n`,
        `Subject: ${subject}\n\n`,
        content,
      ].join('');

      const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  })();
});

app.use('/api', router);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 