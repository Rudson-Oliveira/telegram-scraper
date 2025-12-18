/**
 * Serviço de Geração de Vídeo com Kling AI
 * Integração completa para criar vídeos a partir de texto ou imagens
 */

import axios from 'axios';

const KLING_API_URL = 'https://api-singapore.klingai.com/v1';
const KLING_API_KEY = process.env.KLING_API_KEY;

interface VideoGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  duration?: '5' | '10';
  aspectRatio?: '16:9' | '9:16' | '1:1';
  mode?: 'std' | 'pro';
  model?: 'kling-v1' | 'kling-v1-5' | 'kling-v2-master';
  imageUrl?: string; // Para image-to-video
}

interface VideoGenerationResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

interface TaskStatusResponse {
  taskId: string;
  status: 'submitted' | 'processing' | 'succeed' | 'failed';
  videoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Gerar vídeo a partir de texto
export async function generateVideoFromText(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
  if (!KLING_API_KEY) {
    throw new Error('KLING_API_KEY não configurada');
  }

  try {
    const response = await axios.post(
      `${KLING_API_URL}/videos/text2video`,
      {
        model_name: request.model || 'kling-v1-5',
        prompt: request.prompt,
        negative_prompt: request.negativePrompt || '',
        cfg_scale: 0.5,
        mode: request.mode || 'std',
        aspect_ratio: request.aspectRatio || '16:9',
        duration: request.duration || '5',
      },
      {
        headers: {
          'Authorization': `Bearer ${KLING_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      taskId: response.data.data?.task_id || response.data.task_id,
      status: 'pending',
    };
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    console.error('Erro ao gerar vídeo:', axiosError.response?.data || axiosError.message);
    return {
      taskId: '',
      status: 'failed',
      error: axiosError.response?.data?.message || 'Erro ao gerar vídeo',
    };
  }
}

// Gerar vídeo a partir de imagem
export async function generateVideoFromImage(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
  if (!KLING_API_KEY) {
    throw new Error('KLING_API_KEY não configurada');
  }

  if (!request.imageUrl) {
    throw new Error('URL da imagem é obrigatória para image-to-video');
  }

  try {
    const response = await axios.post(
      `${KLING_API_URL}/videos/image2video`,
      {
        model_name: request.model || 'kling-v1-5',
        prompt: request.prompt,
        negative_prompt: request.negativePrompt || '',
        cfg_scale: 0.5,
        mode: request.mode || 'std',
        duration: request.duration || '5',
        image: request.imageUrl,
      },
      {
        headers: {
          'Authorization': `Bearer ${KLING_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      taskId: response.data.data?.task_id || response.data.task_id,
      status: 'pending',
    };
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    console.error('Erro ao gerar vídeo:', axiosError.response?.data || axiosError.message);
    return {
      taskId: '',
      status: 'failed',
      error: axiosError.response?.data?.message || 'Erro ao gerar vídeo',
    };
  }
}

// Verificar status da geração de vídeo
export async function checkVideoStatus(taskId: string): Promise<TaskStatusResponse> {
  if (!KLING_API_KEY) {
    throw new Error('KLING_API_KEY não configurada');
  }

  try {
    const response = await axios.get(
      `${KLING_API_URL}/videos/text2video/${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${KLING_API_KEY}`,
        },
      }
    );

    const data = response.data.data || response.data;
    
    return {
      taskId: data.task_id,
      status: data.task_status,
      videoUrl: data.task_result?.videos?.[0]?.url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    console.error('Erro ao verificar status:', axiosError.response?.data || axiosError.message);
    return {
      taskId,
      status: 'failed',
      createdAt: '',
      updatedAt: '',
    };
  }
}

// Lista de modelos disponíveis
export const KLING_MODELS = {
  'kling-v1': 'Kling V1 - Modelo básico',
  'kling-v1-5': 'Kling V1.5 - Modelo intermediário (recomendado)',
  'kling-v2-master': 'Kling V2 Master - Modelo avançado',
};

// Lista de aspect ratios
export const ASPECT_RATIOS = {
  '16:9': 'Paisagem (16:9)',
  '9:16': 'Retrato/Stories (9:16)',
  '1:1': 'Quadrado (1:1)',
};
