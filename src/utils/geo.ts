import axios from 'axios';

export type Location = {
  city: string | null;
  state: string | null;
  country: string | null;
};

type IpQueryResponse = {
  error?: string;
  reason?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
};

const emptyLocation: Location = {
  city: null,
  state: null,
  country: null,
};

// Obtiene la ubicación aproximada de una IP pública sin propagar fallos del proveedor externo.
export async function getLocationFromIp(ip: string | undefined): Promise<Location> {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return emptyLocation;
  }

  try {
    const response = await axios.get<IpQueryResponse>(`https://api.ipquery.io/${ip}`, {
      timeout: 5000,
    });

    if (response.status === 200 && response.data) {
      const data = response.data;

      if (data.error) {
        console.warn('Error en ipquery.io:', data.reason || data.error);
        return emptyLocation;
      }

      return {
        city: data.location?.city || null,
        state: data.location?.state || null,
        country: data.location?.country || null,
      };
    }

    return emptyLocation;
  } catch (error) {
    if (axios.isAxiosError<IpQueryResponse>(error)) {
      if (error.code === 'ECONNABORTED') {
        console.warn('Timeout obteniendo ubicación desde IP');
      } else if (error.response) {
        console.warn(`Error ${error.response.status} en ipquery.io:`, error.response.data);
      } else if (error.request) {
        console.warn('No se recibió respuesta de ipquery.io');
      } else {
        console.warn('Error obteniendo ubicación desde IP:', error.message);
      }
    } else {
      console.warn('Error obteniendo ubicación desde IP:', error);
    }

    return emptyLocation;
  }
}
