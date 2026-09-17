import { useForgeStore } from '~/compositions/useForgeStore';
import useConfig from '~/compositions/useConfig';

export default () =>
  ({
    isAuthenticated: !!useConfig().user,

    user: useConfig().user,

    async authenticate(forgeId?: number) {
      if (!forgeId) {
        console.error('No forge ID provided');
        return;
      }

      const forgeStore = useForgeStore();
      const forgeRef = await forgeStore.getForge(forgeId);
      const forge = forgeRef.value;
      
      if (!forge) {
        console.error('Forge not found:', forgeId);
        return;
      }

      // Construct OAuth authorize URL based on forge type
      const clientId = forge.client || forge.oauth_client_id;
      const baseUrl = forge.oauth_host || forge.url;
      
      if (!clientId) {
        console.error('OAuth client ID not configured for forge:', forge.id);
        return;
      }

      let authorizeUrl: string;
      const config = useConfig();
      const redirectUri = `${config.rootPath}/authorize?forge_id=${forgeId}`;
      const scope = getScopeForForgeType(forge.type);

      switch (forge.type) {
        case 'github':
          authorizeUrl = `${baseUrl}/login/oauth/authorize`;
          break;
        case 'gitlab':
          authorizeUrl = `${baseUrl}/oauth/authorize`;
          break;
        case 'gitea':
        case 'forgejo':
          authorizeUrl = `${baseUrl}/login/oauth/authorize`;
          break;
        case 'bitbucket':
          authorizeUrl = `${baseUrl}/site/oauth2/authorize`;
          break;
        case 'bitbucket-dc':
          authorizeUrl = `${baseUrl}/oauth2/latest/authorize`;
          break;
        default:
          console.error('Unsupported forge type:', forge.type);
          return;
      }

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scope,
        state: generateState(),
      });

      window.location.href = `${authorizeUrl}?${params.toString()}`;
    },
  }) as const;

// Generate a simple state token for CSRF protection
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function getScopeForForgeType(type: string): string {
  switch (type) {
    case 'github':
      return 'user:email read:org repo';
    case 'gitlab':
      return 'read_user read_api';
    case 'gitea':
    case 'forgejo':
      return 'user:email read:organization';
    case 'bitbucket':
      return 'account email';
    case 'bitbucket-dc':
      return 'account email';
    default:
      return '';
  }
}
