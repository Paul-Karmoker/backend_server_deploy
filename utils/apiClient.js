import axios from "axios";


  export async function post(url, data, headers = {}) {
    try {
      const response = await axios.post(url, data, {
        headers: {
          'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
          'Content-Type': 'application/json',
          ...headers
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response ? error.response.data.message : error.message);
    }
  }


