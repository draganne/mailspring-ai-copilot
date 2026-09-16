// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DraftFactory, SyncbackDraftTask, TaskQueue, Actions } = require('mailspring-exports');

// Confirmed against a real shipping Mailspring internal package
// (internal_packages/thread-list/lib/thread-list-context-menu.js,
// forwardAsAttachmentItem): the supported way for a plugin to create a
// draft and hand it to the user is
//   DraftFactory.createDraft/createOrUpdateDraftForReply -> queue a
//   SyncbackDraftTask -> wait for it to perform locally -> composePopoutDraft.
// No `behavior` is passed to createOrUpdateDraftForReply, so it always
// creates a fresh draft rather than overwriting a reply the user may
// already be composing in this thread.
export async function createReplyDraftWithAIBody(params: {
  thread: any;
  message: any;
  bodyHtml: string;
}): Promise<string> {
  const { thread, message, bodyHtml } = params;

  const draft = await DraftFactory.createOrUpdateDraftForReply({ message, thread, type: 'reply' });
  draft.body = `${bodyHtml}${draft.body}`;
  draft.pristine = false;

  const task = new SyncbackDraftTask({ draft });
  Actions.queueTask(task);
  await TaskQueue.waitForPerformLocal(task);

  Actions.composePopoutDraft(draft.headerMessageId);
  return draft.headerMessageId;
}

// Mailspring message bodies are HTML (see thread-text.ts). The LLM returns
// plain text, so wrap paragraphs in <p> and escape any characters that
// would otherwise be interpreted as markup.
export function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .split(/\n{2,}/)
    .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
}
