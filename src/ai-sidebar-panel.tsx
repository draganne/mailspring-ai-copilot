import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FocusedContentStore, MessageStore } = require('mailspring-exports');
import { summarizeThread, composeReply } from './llm-client';
import { buildThreadText } from './thread-text';
import { createReplyDraftWithAIBody, textToHtml } from './reply-draft';

// AppEnv is a real global injected by Mailspring's window bootstrap before
// any package loads — it is not part of `mailspring-exports`.
declare const AppEnv: any;

const DEFAULT_MODELS: Record<string, string> = {
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

type Status = 'idle' | 'loading' | 'success' | 'error';

interface State {
  status: Status;
  summary: string;
  error: string;
  truncated: boolean;
  threadId: string | null;

  replyInput: string;
  replyStatus: Status;
  replyError: string;
}

export default class AISidebarPanel extends React.Component<{}, State> {
  static displayName = 'AISidebarPanel';

  _unsubscribes: Array<() => void> = [];

  constructor(props: {}) {
    super(props);
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

  _currentThreadId(): string | null {
    const thread = FocusedContentStore.focused('thread');
    return thread ? thread.id : null;
  }

  _onFocusChange = () => {
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

  _onSummarizeClick = async () => {
    this.setState({ status: 'loading', error: '', summary: '' });

    try {
      const { provider, apiKey, model } = getConfiguredLLM();

      const messages = MessageStore.items() || [];
      if (messages.length === 0) {
        throw new Error('No messages found in the focused thread.');
      }

      const { text, truncated } = buildThreadText(messages);
      if (!text) {
        throw new Error('Could not read any message content from this thread.');
      }

      const summary = await summarizeThread({ provider, apiKey, model, threadText: text });

      if (this._currentThreadId() !== this.state.threadId) {
        // Thread changed while the request was in flight; discard the result.
        return;
      }

      this.setState({ status: 'success', summary, truncated });
    } catch (err) {
      this.setState({ status: 'error', error: (err as Error).message || String(err) });
    }
  };

  _onReplyInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ replyInput: event.target.value });
  };

  _onComposeReplyClick = async () => {
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

      const { text: threadText } = buildThreadText(messages);
      if (!threadText) {
        throw new Error('Could not read any message content from this thread.');
      }

      const replyText = await composeReply({
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

      await createReplyDraftWithAIBody({
        thread,
        message: lastMessage,
        bodyHtml: textToHtml(replyText),
      });

      this.setState({ replyStatus: 'success', replyInput: '' });
    } catch (err) {
      this.setState({ replyStatus: 'error', replyError: (err as Error).message || String(err) });
    }
  };

  _renderBullets(summary: string) {
    const lines = summary
      .split('\n')
      .map(line => line.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);
    return (
      <ul className="ai-thread-sidebar-summary">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    );
  }

  render() {
    const { status, summary, error, truncated, replyInput, replyStatus, replyError } = this.state;
    const thread = FocusedContentStore.focused('thread');
    if (!thread) {
      return null;
    }

    return (
      <div className="ai-thread-sidebar-panel">
        <div className="ai-thread-sidebar-header">AI Summary</div>

        <button
          className="btn ai-thread-sidebar-button"
          onClick={this._onSummarizeClick}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Summarizing…' : 'Summarize thread'}
        </button>

        {status === 'loading' && (
          <div className="ai-thread-sidebar-loading">Contacting AI provider…</div>
        )}

        {status === 'error' && <div className="ai-thread-sidebar-error">{error}</div>}

        {status === 'success' && (
          <div>
            {this._renderBullets(summary)}
            {truncated && (
              <div className="ai-thread-sidebar-notice">(showing most recent messages only)</div>
            )}
          </div>
        )}

        <div className="ai-thread-sidebar-divider" />

        <div className="ai-thread-sidebar-header">AI Reply</div>

        <textarea
          className="ai-thread-sidebar-reply-input"
          placeholder="What do you want to say? (rough notes are fine — AI will phrase it as a reply)"
          value={replyInput}
          onChange={this._onReplyInputChange}
          disabled={replyStatus === 'loading'}
          rows={4}
        />

        <button
          className="btn ai-thread-sidebar-button"
          onClick={this._onComposeReplyClick}
          disabled={replyStatus === 'loading' || !replyInput.trim()}
        >
          {replyStatus === 'loading' ? 'Drafting reply…' : 'Draft AI reply'}
        </button>

        {replyStatus === 'loading' && (
          <div className="ai-thread-sidebar-loading">Composing and creating draft…</div>
        )}

        {replyStatus === 'error' && <div className="ai-thread-sidebar-error">{replyError}</div>}

        {replyStatus === 'success' && (
          <div className="ai-thread-sidebar-notice">Draft created — opening in composer.</div>
        )}
      </div>
    );
  }
}
