/**
 * Serviço de Geração de Imagem
 * Usa o helper integrado do template para geração de imagens
 */

import { generateImage } from './_core/imageGeneration';

interface ImageGenerationRequest {
  prompt: string;
  style?: 'realistic' | 'artistic' | 'cartoon' | 'abstract';
  size?: 'square' | 'landscape' | 'portrait';
  originalImageUrl?: string; // Para edição de imagem
}

interface ImageGenerationResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

// Estilos de imagem com prefixos de prompt
const STYLE_PREFIXES: Record<string, string> = {
  realistic: 'Photorealistic, high quality, detailed, ',
  artistic: 'Artistic, creative, painterly style, ',
  cartoon: 'Cartoon style, vibrant colors, animated look, ',
  abstract: 'Abstract art, modern, conceptual, ',
};

// Gerar imagem a partir de texto
export async function generateImageFromText(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
  try {
    const stylePrefix = request.style ? STYLE_PREFIXES[request.style] : '';
    const fullPrompt = `${stylePrefix}${request.prompt}`;

    const result = await generateImage({
      prompt: fullPrompt,
    });

    return {
      success: true,
      imageUrl: result.url,
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Erro ao gerar imagem:', err.message);
    return {
      success: false,
      error: err.message || 'Erro ao gerar imagem',
    };
  }
}

// Editar imagem existente
export async function editImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
  if (!request.originalImageUrl) {
    return {
      success: false,
      error: 'URL da imagem original é obrigatória para edição',
    };
  }

  try {
    const result = await generateImage({
      prompt: request.prompt,
      originalImages: [{
        url: request.originalImageUrl,
        mimeType: 'image/jpeg',
      }],
    });

    return {
      success: true,
      imageUrl: result.url,
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Erro ao editar imagem:', err.message);
    return {
      success: false,
      error: err.message || 'Erro ao editar imagem',
    };
  }
}

// Estilos disponíveis para o frontend
export const IMAGE_STYLES = [
  { value: 'realistic', label: 'Realista', description: 'Fotos de alta qualidade' },
  { value: 'artistic', label: 'Artístico', description: 'Estilo pintura/arte' },
  { value: 'cartoon', label: 'Cartoon', description: 'Estilo desenho animado' },
  { value: 'abstract', label: 'Abstrato', description: 'Arte conceitual moderna' },
];
