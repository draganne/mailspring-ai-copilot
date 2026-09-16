"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FocusedContentStore, MessageStore } = require('mailspring-exports');
const llm_client_1 = require("./llm-client");
const thread_text_1 = require("./thread-text");
const reply_draft_1 = require("./reply-draft");
const DEFAULT_MODELS = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-haiku-20241022',
    openrouter: 'openai/gpt-4o-mini',
};
function getConfiguredLLM() {
    const provider = AppEnv.config.get('ai-thread-sidebar.provider') || 'openai';
    const apiKey = AppEnv.config.get('ai-thread-sidebar.apiKey') || '';
    const model = AppEnv.config.get('ai-thread-sidebar.model') || DEFAULT_MODELS[provider];
    return { provider, apiKey, model };
}
class AISidebarPanel extends react_1.default.Component {
    constructor(props) {
        super(props);
        this._unsubscribes = [];
        this._onFocusChange = () => {
            const threadId = this._currentThreadId();
            if (threadId !== this.state.threadId) {
                // FR7: switching threads clears any prior summary and resets to idle.
                this.setState({
                    status: 'idle',
                    summary: '',
                    error: '',
                    truncated: false,
                    threadId,
                    replyInput: '',
                    replyStatus: 'idle',
                    replyError: '',
                });
            }
        };
        this._onSummarizeClick = async () => {
            this.setState({ status: 'loading', error: '', summary: '' });
            try {
                const { provider, apiKey, model } = getConfiguredLLM();
                const messages = MessageStore.items() || [];
                if (messages.length === 0) {
                    throw new Error('No messages found in the focused thread.');
                }
                const { text, truncated } = (0, thread_text_1.buildThreadText)(messages);
                if (!text) {
                    throw new Error('Could not read any message content from this thread.');
                }
                const summary = await (0, llm_client_1.summarizeThread)({ provider, apiKey, model, threadText: text });
                if (this._currentThreadId() !== this.state.threadId) {
                    // Thread changed while the request was in flight; discard the result.
                    return;
                }
                this.setState({ status: 'success', summary, truncated });
            }
            catch (err) {
                this.setState({ status: 'error', error: err.message || String(err) });
            }
        };
        this._onReplyInputChange = (event) => {
            this.setState({ replyInput: event.target.value });
        };
        this._onComposeReplyClick = async () => {
            const startedThreadId = this.state.threadId;
            this.setState({ replyStatus: 'loading', replyError: '' });
            try {
                const { provider, apiKey, model } = getConfiguredLLM();
                const thread = FocusedContentStore.focused('thread');
                const messages = MessageStore.items() || [];
                if (!thread || messages.length === 0) {
                    throw new Error('No messages found in the focused thread.');
                }
                const lastMessage = messages[messages.length - 1];
                const { text: threadText } = (0, thread_text_1.buildThreadText)(messages);
                if (!threadText) {
                    throw new Error('Could not read any message content from this thread.');
                }
                const replyText = await (0, llm_client_1.composeReply)({
                    provider,
                    apiKey,
                    model,
                    threadText,
                    userInput: this.state.replyInput,
                });
                if (this._currentThreadId() !== startedThreadId) {
                    // Thread changed while the request was in flight; discard the result.
                    return;
                }
                await (0, reply_draft_1.createReplyDraftWithAIBody)({
                    thread,
                    message: lastMessage,
                    bodyHtml: (0, reply_draft_1.textToHtml)(replyText),
                });
                this.setState({ replyStatus: 'success', replyInput: '' });
            }
            catch (err) {
                this.setState({ replyStatus: 'error', replyError: err.message || String(err) });
            }
        };
        this.state = {
            status: 'idle',
            summary: '',
            error: '',
            truncated: false,
            threadId: this._currentThreadId(),
            replyInput: '',
            replyStatus: 'idle',
            replyError: '',
        };
    }
    componentDidMount() {
        this._unsubscribes.push(FocusedContentStore.listen(this._onFocusChange));
    }
    componentWillUnmount() {
        this._unsubscribes.forEach(unsub => unsub());
    }
    _currentThreadId() {
        const thread = FocusedContentStore.focused('thread');
        return thread ? thread.id : null;
    }
    _renderBullets(summary) {
        const lines = summary
            .split('\n')
            .map(line => line.replace(/^[-*•]\s*/, '').trim())
            .filter(Boolean);
        return (react_1.default.createElement("ul", { className: "ai-thread-sidebar-summary" }, lines.map((line, i) => (react_1.default.createElement("li", { key: i }, line)))));
    }
    render() {
        const { status, summary, error, truncated, replyInput, replyStatus, replyError } = this.state;
        const thread = FocusedContentStore.focused('thread');
        if (!thread) {
            return null;
        }
        return (react_1.default.createElement("div", { className: "ai-thread-sidebar-panel" },
            react_1.default.createElement("div", { className: "ai-thread-sidebar-header" }, "AI Summary"),
            react_1.default.createElement("button", { className: "btn ai-thread-sidebar-button", onClick: this._onSummarizeClick, disabled: status === 'loading' }, status === 'loading' ? 'Summarizing…' : 'Summarize thread'),
            status === 'loading' && (react_1.default.createElement("div", { className: "ai-thread-sidebar-loading" }, "Contacting AI provider\u2026")),
            status === 'error' && react_1.default.createElement("div", { className: "ai-thread-sidebar-error" }, error),
            status === 'success' && (react_1.default.createElement("div", null,
                this._renderBullets(summary),
                truncated && (react_1.default.createElement("div", { className: "ai-thread-sidebar-notice" }, "(showing most recent messages only)")))),
            react_1.default.createElement("div", { className: "ai-thread-sidebar-divider" }),
            react_1.default.createElement("div", { className: "ai-thread-sidebar-header" }, "AI Reply"),
            react_1.default.createElement("textarea", { className: "ai-thread-sidebar-reply-input", placeholder: "What do you want to say? (rough notes are fine \u2014 AI will phrase it as a reply)", value: replyInput, onChange: this._onReplyInputChange, disabled: replyStatus === 'loading', rows: 4 }),
            react_1.default.createElement("button", { className: "btn ai-thread-sidebar-button", onClick: this._onComposeReplyClick, disabled: replyStatus === 'loading' || !replyInput.trim() }, replyStatus === 'loading' ? 'Drafting reply…' : 'Draft AI reply'),
            replyStatus === 'loading' && (react_1.default.createElement("div", { className: "ai-thread-sidebar-loading" }, "Composing and creating draft\u2026")),
            replyStatus === 'error' && react_1.default.createElement("div", { className: "ai-thread-sidebar-error" }, replyError),
            replyStatus === 'success' && (react_1.default.createElement("div", { className: "ai-thread-sidebar-notice" }, "Draft created \u2014 opening in composer."))));
    }
}
AISidebarPanel.displayName = 'AISidebarPanel';
exports.default = AISidebarPanel;
