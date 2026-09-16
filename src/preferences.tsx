import React from 'react';

// AppEnv is a real global injected by Mailspring's window bootstrap before
// any package loads (confirmed against Mailspring's own internal packages,
// which reference it the same way) — it is not part of `mailspring-exports`.
declare const AppEnv: any;

type Provider = 'openai' | 'anthropic' | 'openrouter';

const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
  openrouter: 'openai/gpt-4o-mini',
};

const PROVIDER_HOSTS: Record<Provider, string> = {
  openai: 'api.openai.com',
  anthropic: 'api.anthropic.com',
  openrouter: 'openrouter.ai',
};

interface State {
  provider: Provider;
  apiKey: string;
  model: string;
}

export default class AIThreadSidebarPreferences extends React.Component<{}, State> {
  static displayName = 'AIThreadSidebarPreferences';

  constructor(props: {}) {
    super(props);
    const provider = (AppEnv.config.get('ai-thread-sidebar.provider') as Provider) || 'openai';
    this.state = {
      provider,
      apiKey: AppEnv.config.get('ai-thread-sidebar.apiKey') || '',
      model: AppEnv.config.get('ai-thread-sidebar.model') || DEFAULT_MODELS[provider],
    };
  }

  _onProviderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = event.target.value as Provider;
    const model = this.state.model || DEFAULT_MODELS[provider];
    this.setState({ provider, model });
    AppEnv.config.set('ai-thread-sidebar.provider', provider);
    AppEnv.config.set('ai-thread-sidebar.model', model);
  };

  _onApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const apiKey = event.target.value;
    this.setState({ apiKey });
    AppEnv.config.set('ai-thread-sidebar.apiKey', apiKey);
  };

  _onModelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const model = event.target.value;
    this.setState({ model });
    AppEnv.config.set('ai-thread-sidebar.model', model);
  };

  render() {
    const { provider, apiKey, model } = this.state;
    return (
      <div className="container-flex ai-thread-sidebar-preferences">
        <h6>Mailspring AI Copilot</h6>

        <div className="row">
          <label>Provider</label>
          <select value={provider} onChange={this._onProviderChange}>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>

        <div className="row">
          <label>API key</label>
          <input
            type="password"
            value={apiKey}
            onChange={this._onApiKeyChange}
            placeholder="sk-..."
          />
        </div>

        <div className="row">
          <label>Model</label>
          <input
            type="text"
            value={model}
            onChange={this._onModelChange}
            placeholder={DEFAULT_MODELS[provider]}
          />
        </div>

        <div className="ai-thread-sidebar-preferences-note">
          Your API key is stored locally and sent only to {PROVIDER_HOSTS[provider]}.
          {provider === 'openrouter' && (
            <>
              {' '}Model must be an OpenRouter model slug, e.g.{' '}
              <code>openai/gpt-4o-mini</code> or <code>anthropic/claude-3.5-haiku</code>.
            </>
          )}
        </div>
      </div>
    );
  }
}
