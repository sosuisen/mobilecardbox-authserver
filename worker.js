export default {
    async fetch(request, env) {
      // CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      if (request.method === 'POST' && new URL(request.url).pathname === '/oauth/token') {
        try {
          const { code, code_verifier, redirect_uri } = await request.json();

          // Exchange code for token with GitHub
          const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              client_id: env.GITHUB_CLIENT_ID,
              client_secret: env.GITHUB_CLIENT_SECRET, // Secure on server
              code: code,
              redirect_uri: redirect_uri,
              // Note: GitHub OAuth Apps don't support code_verifier yet
              // This is for future PKCE support
            }),
          });

          const tokenData = await tokenResponse.json();

          return new Response(JSON.stringify(tokenData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: 'Token exchange failed' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response('Not found', { status: 404 });
    },
  };