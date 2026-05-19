import twilio from 'twilio';
import {
  getConversationsServiceSid,
  getTwilioStandardKeyConfig
} from './config.js';

class ConversationsAdapter {
  constructor() {
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
    await this.client.conversations.v1
      .services(this.serviceSid)
      .conversations(conversationSid)
      .remove();
  }

  async generateAccessToken({ identity, ttl = 3600 }) {
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
