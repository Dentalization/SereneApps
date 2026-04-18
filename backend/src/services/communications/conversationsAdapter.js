const twilio = require('twilio');

class ConversationsAdapter {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_API_KEY_SID, 
      process.env.TWILIO_API_KEY_SECRET, 
      { accountSid: process.env.TWILIO_ACCOUNT_SID }
    );
    this.serviceSid = process.env.TWILIO_CONVERSATIONS_SERVICE_SID;
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
        // Conversation already exists: fetch existing by uniqueName and return it
        const conversations = await this.client.conversations.v1
          .services(this.serviceSid)
          .conversations
          .list({ limit: 50 });
          
        const existing = conversations.find(c => c.uniqueName === uniqueName);
        if (existing) {
          return { sid: existing.sid, uniqueName: existing.uniqueName };
        }
      }
      throw { code: 'TWILIO_CONVERSATIONS_ERROR', message: err.message, twilioCode: err.code };
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

  async sendMessage({ conversationSid, author, body, attributes = {} }) {
    const message = await this.client.conversations.v1
      .services(this.serviceSid)
      .conversations(conversationSid)
      .messages
      .create({ author, body, attributes: JSON.stringify(attributes) });
      
    return { messageSid: message.sid };
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
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY_SID,
      process.env.TWILIO_API_KEY_SECRET,
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

module.exports = ConversationsAdapter;
