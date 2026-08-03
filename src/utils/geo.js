import axios from 'axios';

export const getLocationFromIp = async (ip) => {
  // If the IP is localhost or private, return nulls
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { city: null, state: null, country: null };
  }

  try {
    const response = await axios.get(`https://api.ipquery.io/${ip}`, {
      timeout: 5000 // 5 segundos
    });

    // Verify if the response is valid and contains the expected data
    if (response.status === 200 && response.data) {
      const data = response.data;

      // Verify if the API returned an error
      if (data.error) {
        console.warn('Error en ipquery.io:', data.reason || data.error);
        return { city: null, state: null, country: null };
      }

      // Extract location from the ipquery.io structure
      return {
        city: data.location?.city || null,
        state: data.location?.state || null,
        country: data.location?.country || null
      };
    }

    return { city: null, state: null, country: null };

  } catch (error) {
    // Verify if the API returned an error
    if (error.code === 'ECONNABORTED') {
      console.warn('Timeout obteniendo ubicación desde IP');
    } else if (error.response) {
      // La solicitud fue hecha y el servidor respondió con un código de estado
      console.warn(`Error ${error.response.status} en ipquery.io:`, error.response.data);
    } else if (error.request) {
      // La solicitud fue hecha pero no se recibió respuesta
      console.warn('No se recibió respuesta de ipquery.io');
    } else {
      console.warn('Error obteniendo ubicación desde IP:', error.message);
    }
    
    return { city: null, state: null, country: null };
  }
};