export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, x-api-key, content-type',
};

export const handleCORS = (cb: (req: any) => Promise<Response>) => {
  return async (req: any) => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
      const response = await cb(req);
      Object.entries(corsHeaders).forEach(([header, value]) => {
        response.headers.set(header, value);
      });
      return response;
    } catch (error) {
      console.error('Error in handleCORS:', error);
      let errorResponse: Response;

      if (error instanceof Response) {
        errorResponse = error;
      } else {
        errorResponse = new Response(JSON.stringify({ error: 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      Object.entries(corsHeaders).forEach(([header, value]) => {
        errorResponse.headers.set(header, value);
      });
      return errorResponse;
    }
  };
};
