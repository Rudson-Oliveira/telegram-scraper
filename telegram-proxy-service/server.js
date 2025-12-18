// ================================================================
// TELEGRAM PROXY MICROSERVICE
// Microserviço para contornar restrições de segurança do N8N
// Usa biblioteca telegram (gramjs) para raspar canais do Telegram
// ================================================================

const express = require('express');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Logger } = require('telegram/extensions/Logger');
const input = require('input');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Segurança e rate limiting
app.use(helmet());
app.use(express.json({ limit: '10mb' }));

// Rate limiter: máximo 10 requisições por minuto
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10,
  message: { error: 'Too many requests, please try again later' }
});

app.use('/scrape-telegram', limiter);

// Configurações do Telegram
const API_ID = parseInt(process.env.TELEGRAM_API_ID || '0');
const API_HASH = process.env.TELEGRAM_API_HASH || '';
const PHONE = process.env.TELEGRAM_PHONE || '';
const SESSION_STRING = process.env.TELEGRAM_SESSION || '';
const API_TOKEN = process.env.API_TOKEN || 'secure-token-change-me';

// Logger do Telegram (desabilitar em produção)
Logger.setLevel(process.env.NODE_ENV === 'production' ? 'none' : 'error');

// Cliente Telegram (singleton)
let telegramClient = null;
let isConnecting = false;
let connectionError = null;

// Palavras-chave para identificar prompts
const PROMPT_KEYWORDS = [
  'prompt', 'chatgpt', 'gpt', 'claude', 'gemini', 'ai', 'ia',
  'engenharia de prompt', 'prompt engineering', 'llm',
  'midjourney', 'dall-e', 'stable diffusion', 'runway',
  'automação', 'automation', 'n8n', 'make', 'zapier'
];

// ================================================================
// FUNÇÕES AUXILIARES
// ================================================================

function isPromptContent(text) {
  if (!text) return false;
  const textLower = text.toLowerCase();
  return PROMPT_KEYWORDS.some(keyword => textLower.includes(keyword));
}

function getMessageType(message) {
  if (message.media) {
    const mediaType = message.media.className;
    if (mediaType.includes('Photo')) return 'image';
    if (mediaType.includes('Document')) {
      const mimeType = message.media.document?.mimeType || '';
      if (mimeType.startsWith('video')) return 'video';
      if (mimeType.startsWith('image')) return 'image';
      if (mimeType.startsWith('audio')) return 'audio';
      return 'document';
    }
  }
  return 'text';
}

async function executeWithRetry(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// ================================================================
// TELEGRAM CLIENT MANAGEMENT
// ================================================================

async function initTelegramClient() {
  if (telegramClient && telegramClient.connected) {
    return telegramClient;
  }

  if (isConnecting) {
    // Aguardar conexão em andamento
    let attempts = 0;
    while (isConnecting && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    if (telegramClient && telegramClient.connected) {
      return telegramClient;
    }
  }

  isConnecting = true;
  connectionError = null;

  try {
    if (!API_ID || !API_HASH) {
      throw new Error('TELEGRAM_API_ID and TELEGRAM_API_HASH are required!');
    }

    console.log('Initializing Telegram client...');
    const session = new StringSession(SESSION_STRING);
    
    telegramClient = new TelegramClient(session, API_ID, API_HASH, {
      connectionRetries: 5,
      useWSS: true,
    });

    // Start com tratamento de autenticação
    await telegramClient.start({
      phoneNumber: async () => {
        console.log('Phone number requested');
        return PHONE;
      },
      password: async () => {
        console.log('2FA password requested');
        // Em produção, use variável de ambiente
        return process.env.TELEGRAM_PASSWORD || '';
      },
      phoneCode: async () => {
        console.log('Phone code requested');
        // Em produção, implemente sistema de código
        if (process.env.TELEGRAM_CODE) {
          return process.env.TELEGRAM_CODE;
        }
        // Fallback para input manual (apenas desenvolvimento)
        return await input.text('Enter code: ');
      },
      onError: (err) => {
        console.error('Authentication error:', err);
        connectionError = err;
      },
    });

    // Salvar sessão
    const newSessionString = telegramClient.session.save();
    if (newSessionString !== SESSION_STRING) {
      console.log('⚠️  NEW SESSION STRING - Save this to TELEGRAM_SESSION:');
      console.log(newSessionString);
    }

    console.log('✓ Telegram client connected');
    isConnecting = false;
    return telegramClient;

  } catch (error) {
    isConnecting = false;
    connectionError = error;
    console.error('Failed to initialize Telegram client:', error);
    throw error;
  }
}

// ================================================================
// SCRAPING FUNCTIONS
// ================================================================

async function scrapeChannel(client, channelUsername, limit = 100) {
  const messages = [];
  
  try {
    console.log(`Scraping channel: ${channelUsername}`);
    const entity = await client.getEntity(channelUsername);
    
    const channelMessages = await client.getMessages(entity, { limit });
    
    for (const message of channelMessages) {
      if (!message.message && !message.media) continue;
      
      const msgData = {
        id: `${channelUsername}_${message.id}`,
        telegram_id: message.id,
        date: message.date ? new Date(message.date * 1000).toISOString() : new Date().toISOString(),
        content: message.message || '[Mídia sem texto]',
        channel: channelUsername,
        sender_id: message.senderId?.toString() || null,
        sender_name: message.fromId?.userId?.toString() || 'Unknown',
        message_type: getMessageType(message),
        has_media: !!message.media,
        is_prompt: isPromptContent(message.message),
        views: message.views || 0,
        forwards: message.forwards || 0,
        scraped_at: new Date().toISOString()
      };
      
      messages.push(msgData);
    }
    
    console.log(`✓ Collected ${messages.length} messages from ${channelUsername}`);
  } catch (error) {
    console.error(`Error scraping ${channelUsername}:`, error.message);
    throw error;
  }
  
  return messages;
}

async function scrapeMultipleChannels(channels, limit = 100) {
  const client = await initTelegramClient();
  
  const allMessages = [];
  const stats = {
    total_messages: 0,
    total_channels: channels.length,
    total_images: 0,
    total_videos: 0,
    total_prompts: 0,
    channels_processed: [],
    errors: []
  };
  
  for (const channel of channels) {
    try {
      const channelMessages = await executeWithRetry(
        () => scrapeChannel(client, channel.trim(), limit),
        3,
        2000
      );
      
      allMessages.push(...channelMessages);
      
      stats.total_messages += channelMessages.length;
      stats.total_images += channelMessages.filter(m => m.message_type === 'image').length;
      stats.total_videos += channelMessages.filter(m => m.message_type === 'video').length;
      stats.total_prompts += channelMessages.filter(m => m.is_prompt).length;
      stats.channels_processed.push({
        channel: channel.trim(),
        messages: channelMessages.length,
        success: true
      });
      
      // Rate limiting entre canais
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`Failed to scrape channel ${channel}:`, error.message);
      stats.errors.push({
        channel: channel.trim(),
        error: error.message
      });
      stats.channels_processed.push({
        channel: channel.trim(),
        messages: 0,
        success: false,
        error: error.message
      });
    }
  }
  
  return {
    messages: allMessages,
    stats: stats,
    timestamp: new Date().toISOString()
  };
}

// ================================================================
// API ENDPOINTS
// ================================================================

// Health check
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    telegram_connected: telegramClient?.connected || false,
    connection_error: connectionError?.message || null,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
  res.json(health);
});

// Middleware de autenticação
function authenticate(req, res, next) {
  const token = req.headers['authorization'] || req.headers['x-api-token'];
  
  if (!token || token !== `Bearer ${API_TOKEN}`) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing API token'
    });
  }
  
  next();
}

// Endpoint principal: scrape telegram
app.post('/scrape-telegram', authenticate, async (req, res) => {
  try {
    const { channels, limit = 100 } = req.body;
    
    // Validação
    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'channels must be a non-empty array'
      });
    }
    
    if (channels.length > 20) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Maximum 20 channels per request'
      });
    }
    
    if (limit > 1000) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Maximum limit is 1000 messages per channel'
      });
    }
    
    console.log(`\n[${new Date().toISOString()}] Scraping request:`);
    console.log(`- Channels: ${channels.join(', ')}`);
    console.log(`- Limit: ${limit}`);
    
    // Executar scraping
    const result = await scrapeMultipleChannels(channels, limit);
    
    console.log(`✓ Scraping completed: ${result.stats.total_messages} messages`);
    
    res.json({
      success: true,
      data: result,
      meta: {
        request_time: new Date().toISOString(),
        processing_time_ms: Date.now() - req.startTime
      }
    });
    
  } catch (error) {
    console.error('Scraping error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint de teste (sem autenticação)
app.get('/test', (req, res) => {
  res.json({
    message: 'Telegram Proxy Service is running!',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      scrape: 'POST /scrape-telegram (requires auth)',
      test: 'GET /test'
    }
  });
});

// Middleware de timing
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// ================================================================
// SERVER STARTUP
// ================================================================

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\nSIGTERM received, shutting down gracefully...');
  
  if (telegramClient && telegramClient.connected) {
    await telegramClient.disconnect();
    console.log('✓ Telegram client disconnected');
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  
  if (telegramClient && telegramClient.connected) {
    await telegramClient.disconnect();
    console.log('✓ Telegram client disconnected');
  }
  
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║         TELEGRAM PROXY MICROSERVICE                       ║
║         Running on port ${PORT}                              ║
╚═══════════════════════════════════════════════════════════╝

📍 Endpoints:
   - GET  /health          → Health check
   - GET  /test            → Test endpoint
   - POST /scrape-telegram → Main scraping endpoint (auth required)

🔐 Authentication: Bearer token required
🚀 Ready to accept requests!

⚠️  Make sure to configure these environment variables:
   - TELEGRAM_API_ID
   - TELEGRAM_API_HASH
   - TELEGRAM_PHONE
   - TELEGRAM_SESSION (optional, will be generated on first run)
   - API_TOKEN (for authentication)
`);
});
