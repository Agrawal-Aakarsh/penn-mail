// src/routes/classificationRoutes.ts
import express, { Request, Response, RequestHandler } from 'express';
import classificationService from '../services/classificationService';

const router = express.Router();

interface ClassifyEmailRequest extends Request {
  params: {
    id: string;
  };
}

interface BatchClassifyRequest extends Request {
  body: {
    emailIds: string[];
  };
}

interface ClassifyInboxRequest extends Request {
  body: {
    maxResults?: number;
  };
}

/**
 * @route POST /api/classify/email/:id
 * @desc Classify a single email
 * @access Private
 */
const classifyEmailHandler: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const accessToken = authHeader.split(' ')[1];
    const emailId = req.params.id;
    
    console.log(`[DEBUG] Classifying email: ${emailId}`);
    const result = await classificationService.classifyEmail(accessToken, emailId);
    
    res.json({
      success: true,
      classification: result
    });
  } catch (error) {
    console.error('Error in classify email route:', error);
    res.status(500).json({ 
      error: 'Failed to classify email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * @route POST /api/classify/batch
 * @desc Classify multiple emails at once
 * @access Private
 */
const batchClassifyHandler: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const accessToken = authHeader.split(' ')[1];
    const { emailIds, applyLabels = true } = req.body;
    
    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      res.status(400).json({ error: 'Email IDs array is required' });
      return;
    }
    
    console.log(`[DEBUG] Batch classifying ${emailIds.length} emails, applyLabels: ${applyLabels}`);
    const results = await classificationService.classifyBatch(accessToken, emailIds, applyLabels);
    
    res.json({
      success: true,
      classifications: results
    });
  } catch (error) {
    console.error('Error in batch classify route:', error);
    res.status(500).json({ 
      error: 'Failed to classify emails in batch',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * @route POST /api/classify/inbox
 * @desc Classify all unread emails in inbox
 * @access Private
 */
const classifyInboxHandler: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const accessToken = authHeader.split(' ')[1];
    const { maxResults = 10 } = req.body;
    
    // Get unread emails from inbox
    const auth = new (require('google-auth-library').OAuth2Client)();
    auth.setCredentials({ access_token: accessToken });
    const gmail = require('googleapis').google.gmail({ version: 'v1', auth });
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: maxResults,
      q: 'is:unread in:inbox',
    });
    
    if (!response.data.messages || response.data.messages.length === 0) {
      res.json({
        success: true,
        message: 'No unread emails found',
        classifications: []
      });
      return;
    }
    
    const emailIds = response.data.messages.map((msg: any) => msg.id);
    console.log(`[DEBUG] Classifying ${emailIds.length} unread emails`);
    
    const results = await classificationService.classifyBatch(accessToken, emailIds);
    
    res.json({
      success: true,
      classifications: results
    });
  } catch (error) {
    console.error('Error in classify inbox route:', error);
    res.status(500).json({ 
      error: 'Failed to classify inbox emails',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Mount routes
router.post('/email/:id', classifyEmailHandler);
router.post('/batch', batchClassifyHandler);
router.post('/inbox', classifyInboxHandler);

export default router;
