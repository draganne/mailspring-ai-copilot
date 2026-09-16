"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const DEFAULT_MODELS = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-haiku-20241022',
    openrouter: 'openai/gpt-4o-mini',
};
const PROVIDER_HOSTS = {
    openai: 'api.openai.com',
    anthropic: 'api.anthropic.com',
    openrouter: 'openrouter.ai',
};
class AIThreadSidebarPreferences extends react_1.default.Component {
    constructor(props) {
        super(props);
        this._onProviderChange = (event) => {
            const provider = event.target.value;
            const model = this.state.model || DEFAULT_MODELS[provider];
            this.setState({ provider, model });
            AppEnv.config.set('ai-thread-sidebar.provider', provider);
            AppEnv.config.set('ai-thread-sidebar.model', model);
        };
        this._onApiKeyChange = (event) => {
            const apiKey = event.target.value;
            this.setState({ apiKey });
            AppEnv.config.set('ai-thread-sidebar.apiKey', apiKey);
        };
        this._onModelChange = (event) => {
            const model = event.target.value;
            this.setState({ model });
            AppEnv.config.set('ai-thread-sidebar.model', model);
        };
        const provider = AppEnv.config.get('ai-thread-sidebar.provider') || 'openai';
        this.state = {
            provider,
            apiKey: AppEnv.config.get('ai-thread-sidebar.apiKey') || '',
            model: AppEnv.config.get('ai-thread-sidebar.model') || DEFAULT_MODELS[provider],
        };
    }
    render() {
        const { provider, apiKey, model } = this.state;
        return (react_1.default.createElement("div", { className: "container-flex ai-thread-sidebar-preferences" },
            react_1.default.createElement("h6", null, "Mailspring AI Copilot"),
            react_1.default.createElement("div", { className: "row" },
                react_1.default.createElement("label", null, "Provider"),
                react_1.default.createElement("select", { value: provider, onChange: this._onProviderChange },
                    react_1.default.createElement("option", { value: "openai" }, "OpenAI"),
                    react_1.default.createElement("option", { value: "anthropic" }, "Anthropic"),
                    react_1.default.createElement("option", { value: "openrouter" }, "OpenRouter"))),
            react_1.default.createElement("div", { className: "row" },
                react_1.default.createElement("label", null, "API key"),
                react_1.default.createElement("input", { type: "password", value: apiKey, onChange: this._onApiKeyChange, placeholder: "sk-..." })),
            react_1.default.createElement("div", { className: "row" },
                react_1.default.createElement("label", null, "Model"),
                react_1.default.createElement("input", { type: "text", value: model, onChange: this._onModelChange, placeholder: DEFAULT_MODELS[provider] })),
            react_1.default.createElement("div", { className: "ai-thread-sidebar-preferences-note" },
                "Your API key is stored locally and sent only to ",
                PROVIDER_HOSTS[provider],
                ".",
                provider === 'openrouter' && (react_1.default.createElement(react_1.default.Fragment, null,
                    ' ',
                    "Model must be an OpenRouter model slug, e.g.",
                    ' ',
                    react_1.default.createElement("code", null, "openai/gpt-4o-mini"),
                    " or ",
                    react_1.default.createElement("code", null, "anthropic/claude-3.5-haiku"),
                    ".")))));
    }
}
AIThreadSidebarPreferences.displayName = 'AIThreadSidebarPreferences';
exports.default = AIThreadSidebarPreferences;
