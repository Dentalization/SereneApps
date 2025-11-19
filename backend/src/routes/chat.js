import express from 'express';
import { authenticateToken } from '../utils/tokens.js';
import {
  createChatRoom,
  getChatRooms,
  getChatMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  sendTypingIndicator,
  markMessageAsRead
} from '../controllers/chatController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Chat room management
router.post('/rooms', createChatRoom);
router.get('/rooms', getChatRooms);

// Messages
router.get('/rooms/:id/messages', getChatMessages);
router.post('/rooms/:id/messages', sendMessage);
router.patch('/messages/:id', editMessage);
router.delete('/messages/:id', deleteMessage);

// Real-time features
router.post('/rooms/:id/typing', sendTypingIndicator);
router.post('/messages/:id/read', markMessageAsRead);

export default router;
