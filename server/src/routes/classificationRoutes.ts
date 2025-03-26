// src/routes/classificationRoutes.ts
import express, { Request, Response } from 'express';
import classificationService from '../services/classificationService';

const router = express.Router();

/**
 * @route POST /api/classify/email/:id
 * @desc Classify a single email
 * @access Private
 */
router.post('/email/:id', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
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
});

/**
 * @route POST /api/classify/batch
 * @desc Classify multiple emails at once
 * @access Private
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const accessToken = authHeader.split(' ')[1];
    const { emailIds } = req.body;
    
    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({ error: 'Email IDs array is required' });
    }
    
    console.log(`[DEBUG] Batch classifying ${emailIds.length} emails`);
    const results = await classificationService.classifyBatch(accessToken, emailIds);
    
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
});

/**
 * @route POST /api/classify/inbox
 * @desc Classify all unread emails in inbox
 * @access Private
 */
router.post('/inbox', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
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
      return res.json({
        success: true,
        message: 'No unread emails found',
        classifications: []
      });
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
});

export default router;
