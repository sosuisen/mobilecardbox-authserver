export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 200,
        headers: corsHeaders 
      });
    }

    const url = new URL(request.url);
    
    if (request.method === 'POST' && url.pathname === '/oauth/token') {
      try {
        const { code, redirect_uri, environment } = await request.json();
        
        const isProduction = environment === 'production';
        const clientId = isProduction ? env.GITHUB_CLIENT_ID_PROD : env.GITHUB_CLIENT_ID;
        const clientSecret = isProduction ? env.GITHUB_CLIENT_SECRET_PROD : env.GITHUB_CLIENT_SECRET;

        console.log(`Received OAuth token request for ${isProduction ? 'production' : 'development'} environment, ID: ${clientId}, code: ${code}`);

        if (!clientId || !clientSecret) {
          return new Response(JSON.stringify({ 
            error: 'server_error',
            error_description: `Server configuration incomplete for ${isProduction ? 'production' : 'development'} environment` 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const contentType = request.headers.get('Content-Type');
        if (!contentType || !contentType.includes('application/json')) {
          return new Response(JSON.stringify({ 
            error: 'invalid_request',
            error_description: 'Content-Type must be application/json' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!code || !redirect_uri) {
          return new Response(JSON.stringify({ 
            error: 'invalid_request',
            error_description: 'Missing required parameters: code, redirect_uri' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'MobileCardBox-AuthServer/1.0',
          },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
            redirect_uri: redirect_uri,
          }),
        });

        if (!tokenResponse.ok) {
          return new Response(JSON.stringify({ 
            error: 'server_error',
            error_description: 'Failed to exchange authorization code' 
          }), {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
          return new Response(JSON.stringify(tokenData), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(tokenData), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (error) {
        console.error('OAuth token exchange error:', error);
        return new Response(JSON.stringify({ 
          error: 'server_error',
          error_description: 'Internal server error' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ 
      error: 'not_found',
      error_description: 'Endpoint not found' 
    }), { 
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
};