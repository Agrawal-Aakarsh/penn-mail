import express, { Request, Response, Router, IRoute, RequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ParamsDictionary } from 'express-serve-static-core';
import { ILayer } from 'express-serve-static-core';
import { gmail_v1 } from 'googleapis';
import { Query } from 'express-serve-static-core';

dotenv.config();

const app = express();

// Debug middleware
app.use((req, res, next) => {
  console.log(`[DEBUG] Incoming request: ${req.method} ${req.originalUrl}`);
  console.log('[DEBUG] Headers:', req.headers);
  next();
});

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Set up middleware first
app.use(cors(corsOptions));
app.use(express.json());

// Create router
const router = express.Router();

// Test route to verify router mounting
router.get('/test', (req, res) => {
  res.json({ message: 'Router is working' });
});

// Log that we're setting up routes
console.log('Setting up routes...');

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
  label: string;
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

const draftsHandler: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const accessToken = authHeader.split(' ')[1];
    const gmail = getGmailClient(accessToken);
    
    console.log('Fetching drafts');
    const response = await gmail.users.drafts.list({
      userId: 'me',
      maxResults: 20
    });

    if (!response.data || !response.data.drafts) {
      console.log('No drafts found');
      res.json([]);
      return;
    }

    console.log('Gmail API drafts response:', response.data);

    const drafts = response.data.drafts;
    const draftPromises = drafts.map(async (draft: any) => {
      try {
        if (!draft.id) {
          console.log('Draft has no ID');
          return null;
        }

        console.log('\nFetching draft:', draft.id);
        const draftData = await gmail.users.drafts.get({
          userId: 'me',
          id: draft.id
        });

        if (!draftData.data || !draftData.data.message) {
          console.log('No message found in draft');
          return null;
        }

        const message = draftData.data.message;
        if (!message.payload || !message.payload.headers) {
          console.log('No payload or headers found in draft message');
          return null;
        }

        const headers = message.payload.headers;
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(no subject)';
        const from = headers.find((h: any) => h.name === 'From')?.value || '';
        const to = headers.find((h: any) => h.name === 'To')?.value || '';
        const date = headers.find((h: any) => h.name === 'Date')?.value || '';

        const body = getMessageBody(message.payload);

        const email: EmailMessage = {
          id: draft.id,
          threadId: message.threadId || '',
          subject,
          from,
          to,
          date,
          snippet: message.snippet || '',
          body: body || message.snippet || '',
          label: 'draft'
        };
        console.log('Processed draft:', { id: email.id, subject: email.subject });
        return email;
      } catch (error) {
        console.error('Error fetching draft content:', error);
        return null;
      }
    });

    const draftEmails = (await Promise.all(draftPromises)).filter((email): email is EmailMessage => {
      return email !== null;
    });
    
    console.log(`Successfully processed ${draftEmails.length} drafts`);
    res.json(draftEmails);
  } catch (error) {
    console.error('Error in drafts route:', error);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
};

const emailsHandler: RequestHandler = async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1];
    if (!accessToken) {
      console.log('[DEBUG] No access token provided');
      res.status(401).json({ error: 'No access token provided' });
      return;
    }

    // If no label is specified, fetch inbox emails by default
    const label = req.query.label || 'inbox';
    console.log('[DEBUG] Fetching emails for label:', label);

    const gmail = getGmailClient(accessToken);
    const query: gmail_v1.Params$Resource$Users$Messages$List = {
      userId: 'me',
      maxResults: 10,
      pageToken: req.query.pageToken as string | undefined,
      q: req.query.search as string | undefined,
      labelIds: []
    };

    try {
      switch (label) {
        case 'sent':
          query.labelIds = ['SENT'];
          break;
        case 'drafts':
          query.labelIds = ['DRAFT'];
          break;
        case 'inbox':
        default:
          query.labelIds = ['INBOX'];
          break;
      }

      console.log('[DEBUG] Gmail API query:', query);
      const response = await gmail.users.messages.list(query);
      console.log('[DEBUG] Gmail API response:', response.data);

      if (!response.data.messages) {
        console.log('[DEBUG] No messages found');
        res.json({
          emails: [],
          nextPageToken: response.data.nextPageToken,
          resultSizeEstimate: 0
        });
        return;
      }

      const messages = response.data.messages;
      const emailPromises = messages.map(async (msg) => {
        try {
          console.log('\n[DEBUG] Fetching email:', msg.id);
          const emailData = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'full',
          });

          const message = emailData.data;
          const headers = message.payload?.headers;
          
          if (!headers) {
            console.log('[DEBUG] No headers found in message');
            return null;
          }

          const subject = headers.find(h => h.name === 'Subject')?.value || '(no subject)';
          const from = headers.find(h => h.name === 'From')?.value || '';
          const to = headers.find(h => h.name === 'To')?.value || '';
          const date = headers.find(h => h.name === 'Date')?.value || '';

          // Log message structure for debugging
          logMessageStructure(message);

          const body = message.payload ? getMessageBody(message.payload) : '';
          console.log('[DEBUG] Extracted body length:', body.length);
          if (body.length > 0) {
            console.log('[DEBUG] Body preview:', body.substring(0, 200));
          } else {
            console.log('[DEBUG] No body content extracted');
          }

          const email = {
            id: message.id || '',
            threadId: message.threadId || '',
            subject,
            from,
            to,
            date,
            snippet: message.snippet || '',
            body: body || message.snippet || '',
            label: label as string,
            unread: message.labelIds?.includes('UNREAD') || false
          };
          console.log('[DEBUG] Processed email:', { id: email.id, subject: email.subject });
          return email;
        } catch (error) {
          console.error('[DEBUG] Error fetching individual email:', error);
          return null;
        }
      });

      const emails = (await Promise.all(emailPromises)).filter(Boolean);
      console.log(`[DEBUG] Successfully processed ${emails.length} emails for label ${label}`);
      
      // Return pagination info along with emails
      res.json({
        emails,
        nextPageToken: response.data.nextPageToken,
        resultSizeEstimate: response.data.resultSizeEstimate
      });
    } catch (error) {
      console.error('[DEBUG] Error in Gmail API call:', error);
      res.status(500).json({ 
        error: 'Failed to fetch emails from Gmail API',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('[DEBUG] Error in emails handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      error: 'Failed to fetch emails',
      details: errorMessage
    });
  }
};

const sendEmailHandler: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
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
};

const saveDraftHandler: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
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

    await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: encodedMessage,
        },
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving draft:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
};

const debugRoutesHandler: RequestHandler = (req, res) => {
  const routes: Array<{path: string, methods: string[]}> = [];
  router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          routes.push({
            path: '/api' + handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  res.json(routes);
};

// Mount routes
router.get('/emails/drafts', draftsHandler);
router.get('/emails', emailsHandler);
router.post('/emails/send', sendEmailHandler);
router.post('/emails/draft', saveDraftHandler);
router.get('/debug/routes', debugRoutesHandler);

// Mount the router first
app.use('/api', router);

// 404 handler
app.use((req: Request, res: Response) => {
  console.log('[DEBUG] No route matched:', {
    method: req.method,
    url: req.originalUrl,
    baseUrl: req.baseUrl,
    path: req.path
  });
  res.status(404).json({ 
    error: 'Not Found',
    requestedPath: req.originalUrl,
    availableRoutes: router.stack
      .filter((r: ILayer): r is ILayer & { route: IRoute & { methods: Record<string, boolean> } } => 
        r.route !== undefined
      )
      .map(r => ({
        path: '/api' + r.route.path,
        methods: Object.keys(r.route.methods)
      }))
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('\nRegistered routes:');
  router.stack
    .filter((r: ILayer): r is ILayer & { route: IRoute & { methods: Record<string, boolean> } } => 
      r.route !== undefined
    )
    .forEach(r => {
      console.log(`${Object.keys(r.route.methods).join(', ').toUpperCase()}: /api${r.route.path}`);
    });
}); 