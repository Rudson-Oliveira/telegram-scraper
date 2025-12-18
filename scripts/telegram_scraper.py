#!/usr/bin/env python3
"""
Telegram Scraper - Script de Raspagem usando Telethon
Autor: Manus AI (autorizado por Rudson Oliveira)
Descrição: Coleta mensagens, imagens, vídeos e prompts de canais/grupos do Telegram
"""

import os
import sys
import json
import asyncio
import argparse
from datetime import datetime
from pathlib import Path

try:
    from telethon import TelegramClient
    from telethon.tl.types import MessageMediaPhoto, MessageMediaDocument
    from telethon.errors import SessionPasswordNeededError
except ImportError:
    print("Erro: Telethon não instalado. Execute: pip install telethon")
    sys.exit(1)

# Configurações
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
MEDIA_DIR = DATA_DIR / "media"
SESSION_DIR = DATA_DIR / "sessions"

# Criar diretórios se não existirem
DATA_DIR.mkdir(exist_ok=True)
MEDIA_DIR.mkdir(exist_ok=True)
SESSION_DIR.mkdir(exist_ok=True)

# Palavras-chave para identificar prompts
PROMPT_KEYWORDS = [
    "prompt", "chatgpt", "gpt", "claude", "gemini", "ai", "ia",
    "engenharia de prompt", "prompt engineering", "llm",
    "midjourney", "dall-e", "stable diffusion", "runway",
    "automação", "automation", "n8n", "make", "zapier",
    "workflow", "agente", "agent"
]


def is_prompt_content(text: str) -> bool:
    """Verifica se o texto contém conteúdo relacionado a prompts/IA"""
    if not text:
        return False
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in PROMPT_KEYWORDS)


def get_message_type(message) -> str:
    """Determina o tipo de mensagem"""
    if message.media:
        if isinstance(message.media, MessageMediaPhoto):
            return "image"
        elif isinstance(message.media, MessageMediaDocument):
            mime_type = getattr(message.media.document, 'mime_type', '')
            if mime_type.startswith('video'):
                return "video"
            elif mime_type.startswith('image'):
                return "image"
            elif mime_type.startswith('audio'):
                return "audio"
            else:
                return "document"
    return "text"


class TelegramScraper:
    def __init__(self, api_id: str, api_hash: str, phone: str = None):
        self.api_id = api_id
        self.api_hash = api_hash
        self.phone = phone
        self.session_file = SESSION_DIR / "telegram_session"
        self.client = None
        self.collected_messages = []
        
    async def connect(self):
        """Conecta ao Telegram"""
        self.client = TelegramClient(
            str(self.session_file),
            self.api_id,
            self.api_hash
        )
        await self.client.start(phone=self.phone)
        print("✅ Conectado ao Telegram com sucesso!")
        
    async def disconnect(self):
        """Desconecta do Telegram"""
        if self.client:
            await self.client.disconnect()
            print("🔌 Desconectado do Telegram")
            
    async def get_channel_info(self, channel_username: str) -> dict:
        """Obtém informações de um canal/grupo"""
        try:
            entity = await self.client.get_entity(channel_username)
            return {
                "id": entity.id,
                "title": getattr(entity, 'title', getattr(entity, 'first_name', 'Unknown')),
                "username": getattr(entity, 'username', None),
                "participants_count": getattr(entity, 'participants_count', None),
            }
        except Exception as e:
            print(f"❌ Erro ao obter info do canal {channel_username}: {e}")
            return None
            
    async def scrape_channel(
        self, 
        channel_username: str, 
        limit: int = 100,
        download_media: bool = False
    ) -> list:
        """Raspa mensagens de um canal/grupo"""
        messages = []
        
        try:
            entity = await self.client.get_entity(channel_username)
            print(f"📡 Raspando canal: {getattr(entity, 'title', channel_username)}")
            
            async for message in self.client.iter_messages(entity, limit=limit):
                msg_data = {
                    "id": message.id,
                    "date": message.date.isoformat() if message.date else None,
                    "text": message.text or "",
                    "sender_id": message.sender_id,
                    "sender_name": None,
                    "message_type": get_message_type(message),
                    "has_media": message.media is not None,
                    "media_url": None,
                    "is_prompt": is_prompt_content(message.text),
                    "views": getattr(message, 'views', None),
                    "forwards": getattr(message, 'forwards', None),
                    "channel_username": channel_username,
                }
                
                # Obter nome do remetente
                if message.sender:
                    msg_data["sender_name"] = getattr(
                        message.sender, 
                        'first_name', 
                        getattr(message.sender, 'title', 'Unknown')
                    )
                
                # Download de mídia se solicitado
                if download_media and message.media:
                    try:
                        media_path = MEDIA_DIR / f"{channel_username}_{message.id}"
                        downloaded = await message.download_media(file=str(media_path))
                        if downloaded:
                            msg_data["media_url"] = str(downloaded)
                    except Exception as e:
                        print(f"⚠️ Erro ao baixar mídia: {e}")
                
                messages.append(msg_data)
                
            print(f"✅ Coletadas {len(messages)} mensagens de {channel_username}")
            
        except Exception as e:
            print(f"❌ Erro ao raspar {channel_username}: {e}")
            
        return messages
    
    async def scrape_multiple_channels(
        self, 
        channels: list, 
        limit_per_channel: int = 100,
        download_media: bool = False
    ) -> dict:
        """Raspa múltiplos canais"""
        results = {
            "scraped_at": datetime.now().isoformat(),
            "channels": [],
            "total_messages": 0,
            "total_images": 0,
            "total_videos": 0,
            "total_prompts": 0,
            "messages": []
        }
        
        for channel in channels:
            print(f"\n{'='*50}")
            messages = await self.scrape_channel(
                channel, 
                limit=limit_per_channel,
                download_media=download_media
            )
            
            channel_info = await self.get_channel_info(channel)
            if channel_info:
                results["channels"].append(channel_info)
            
            results["messages"].extend(messages)
            results["total_messages"] += len(messages)
            results["total_images"] += sum(1 for m in messages if m["message_type"] == "image")
            results["total_videos"] += sum(1 for m in messages if m["message_type"] == "video")
            results["total_prompts"] += sum(1 for m in messages if m["is_prompt"])
            
        return results
    
    def save_results(self, results: dict, filename: str = None):
        """Salva resultados em JSON"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"scrape_results_{timestamp}.json"
        
        output_path = DATA_DIR / filename
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        
        print(f"\n💾 Resultados salvos em: {output_path}")
        return str(output_path)
    
    def save_results_csv(self, results: dict, filename: str = None):
        """Salva resultados em CSV"""
        import csv
        
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"scrape_results_{timestamp}.csv"
        
        output_path = DATA_DIR / filename
        
        if results["messages"]:
            with open(output_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=results["messages"][0].keys())
                writer.writeheader()
                writer.writerows(results["messages"])
            
            print(f"💾 CSV salvo em: {output_path}")
        
        return str(output_path)


async def main():
    parser = argparse.ArgumentParser(description='Telegram Scraper')
    parser.add_argument('--api-id', required=True, help='Telegram API ID')
    parser.add_argument('--api-hash', required=True, help='Telegram API Hash')
    parser.add_argument('--phone', help='Número de telefone (opcional)')
    parser.add_argument('--channels', nargs='+', required=True, help='Lista de canais para raspar')
    parser.add_argument('--limit', type=int, default=100, help='Limite de mensagens por canal')
    parser.add_argument('--download-media', action='store_true', help='Baixar mídia')
    parser.add_argument('--output', help='Nome do arquivo de saída')
    parser.add_argument('--format', choices=['json', 'csv', 'both'], default='json', help='Formato de saída')
    
    args = parser.parse_args()
    
    scraper = TelegramScraper(
        api_id=args.api_id,
        api_hash=args.api_hash,
        phone=args.phone
    )
    
    try:
        await scraper.connect()
        
        results = await scraper.scrape_multiple_channels(
            channels=args.channels,
            limit_per_channel=args.limit,
            download_media=args.download_media
        )
        
        # Salvar resultados
        if args.format in ['json', 'both']:
            scraper.save_results(results, args.output)
        if args.format in ['csv', 'both']:
            csv_filename = args.output.replace('.json', '.csv') if args.output else None
            scraper.save_results_csv(results, csv_filename)
        
        # Resumo
        print(f"\n{'='*50}")
        print("📊 RESUMO DA RASPAGEM")
        print(f"{'='*50}")
        print(f"Total de mensagens: {results['total_messages']}")
        print(f"Total de imagens: {results['total_images']}")
        print(f"Total de vídeos: {results['total_videos']}")
        print(f"Total de prompts/IA: {results['total_prompts']}")
        
    finally:
        await scraper.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
