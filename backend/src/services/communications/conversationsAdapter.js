import twilio from 'twilio';
import {
  getConversationsServiceSid,
  getTwilioStandardKeyConfig
} from './config.js';

class ConversationsAdapter {
  constructor() {
    if (process.env.TWILIO_MOCK_MODE === 'true') {
      this.accountSid = 'mock_account_sid';
      this.apiKeySid = 'mock_api_key_sid';
      this.apiKeySecret = 'mock_api_key_secret';
      this.serviceSid = 'mock_service_sid';
      return;
    }
    const config = getTwilioStandardKeyConfig();
    this.client = twilio(
      config.apiKeySid,
      config.apiKeySecret,
      { accountSid: config.accountSid }
    );
    this.accountSid = config.accountSid;
    this.apiKeySid = config.apiKeySid;
    this.apiKeySecret = config.apiKeySecret;
    this.serviceSid = getConversationsServiceSid();
  }

  async createConversation({ uniqueName, friendlyName }) {
    if (process.env.TWILIO_MOCK_MODE === 'true') {
      const mockSid = `mock_conv_${Math.random().toString(36).substring(2, 12)}`;
      return { sid: mockSid, uniqueName };
    }
    try {
      const conversation = await this.client.conversations.v1
        .services(this.serviceSid)
        .conversations
        .create({ uniqueName, friendlyName });
        
      return { sid: conversation.sid, uniqueName: conversation.uniqueName };
    } catch (err) {
      if (err.code === 50200) {
        const existing = await this.client.conversations.v1
          .services(this.serviceSid)
          .conversations(uniqueName)
          .fetch();
        return { sid: existing.sid, uniqueName: existing.uniqueName };
      }
      const error = new Error('TWILIO_CONVERSATIONS_ERROR');
      error.twilioMessage = err.message;
      error.twilioCode = err.code;
      throw error;
    }
  }

  async addParticipant({ conversationSid, identity, friendlyName }) {
    if (process.env.TWILIO_MOCK_MODE === 'true') {
      const mockSid = `mock_part_${Math.random().toString(36).substring(2, 12)}`;
      return { participantSid: mockSid };
    }
    try {
      const participant = await this.client.conversations.v1
        .services(this.serviceSid)
        .conversations(conversationSid)
        .participants
        .create({ identity, friendlyName });
        
      return { participantSid: participant.sid };
    } catch (err) {
      if (err.code === 50433) {
        return; // Idempotent: Participant already exists
      }
      throw err;
    }
  }

  async removeParticipant({ conversationSid, identity }) {
    if (process.env.TWILIO_MOCK_MODE === 'true') {
      return { removed: true, participantSid: 'mock_part_removed' };
    }
    const participants = await this.client.conversations.v1
      .services(this.serviceSid)
      .conversations(conversationSid)
      .participants
      .list({ limit: 100 });

    const participant = participants.find((item) => item.identity === identity);
    if (!participant) return { removed: false };

    await this.client.conversations.v1
      .services(this.serviceSid)
      .conversations(conversationSid)
      .participants(participant.sid)
      .remove();

    return { removed: true, participantSid: participant.sid };
  }

  async sendMessage({ conversationSid, author, body, attributes = {} }) {
    if (process.env.TWILIO_MOCK_MODE === 'true') {
      const mockSid = `mock_msg_${Math.random().toString(36).substring(2, 12)}`;
      return {
        messageSid: mockSid,
        dateCreated: new Date().toISOString()
      };
    }
    const message = await this.client.conversations.v1
      .services(this.serviceSid)
      .conversations(conversationSid)
      .messages
      .create({
        author,
        body,
        attributes: JSON.stringify(attributes || {}),
        xTwilioWebhookEnabled: 'true'
      });
      
    return {
      messageSid: message.sid,
      dateCreated: message.dateCreated
    };
  }

  async deleteConversation(conversationSid) {
    if (process.env.TWILIO_MOCK_MODE === 'true') {
      return;
    }
    await this.client.conversations.v1
      .services(this.serviceSid)
      .conversations(conversationSid)
      .remove();
  }

  async generateAccessToken({ identity, ttl = 3600 }) {
    if (process.env.TWILIO_MOCK_MODE === 'true') {
      const mockToken = `mock_token_${Math.random().toString(36).substring(2, 12)}`;
      return { 
        token: mockToken, 
        identity, 
        expiresAt: new Date(Date.now() + ttl * 1000).toISOString() 
      };
    }
    const AccessToken = twilio.jwt.AccessToken;
    const accessToken = new AccessToken(
      this.accountSid,
      this.apiKeySid,
      this.apiKeySecret,
      { identity, ttl }
    );
    
    // Attempt to use ConversationsGrant as requested, fallback to ChatGrant if unsupported in this twilio ver
    const GrantClass = AccessToken.ConversationsGrant || AccessToken.ChatGrant || AccessToken.SyncGrant;
    const grant = new GrantClass({ serviceSid: this.serviceSid });
    accessToken.addGrant(grant);
    
    return { 
      token: accessToken.toJwt(), 
      identity, 
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString() 
    };
  }
}

export default ConversationsAdapter;
