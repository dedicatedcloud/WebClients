import type {
  BroadcastSource,
  CommentInterface,
  CommentThreadInterface,
  EditorRequiresClientMethods,
  InternalEventBusInterface,
  RtsMessagePayload,
  SafeDocsUserState,
  SuggestionSummaryType,
} from '@proton/docs-shared'
import type { WordCountInfoCollection } from '@proton/docs-shared'
import type { EditorOrchestratorInterface } from '../Services/Orchestrator/EditorOrchestratorInterface'
import type { ErrorInfo } from 'react'
import { ApplicationEvent } from '../Application/ApplicationEvent'
import { WordCountEvent } from './Events'
import type { EditorEvent, EditorEventData } from '@proton/docs-shared'

/** Handle messages sent by the editor to the client */
export class EditorToClientRequestHandler implements EditorRequiresClientMethods {
  constructor(
    private editorFrame: HTMLIFrameElement,
    private readonly docOrchestrator: EditorOrchestratorInterface,
    private readonly eventBus: InternalEventBusInterface,
  ) {}

  async editorRequestsPropagationOfUpdate(message: RtsMessagePayload, debugSource: BroadcastSource): Promise<void> {
    return this.docOrchestrator.editorRequestsPropagationOfUpdate(message, debugSource)
  }

  async editorReportingEvent(event: EditorEvent, data: EditorEventData[EditorEvent]): Promise<void> {
    return this.docOrchestrator.editorReportingEvent(event, data)
  }

  async getTypersExcludingSelf(threadId: string): Promise<string[]> {
    return this.docOrchestrator.getTypersExcludingSelf(threadId)
  }

  async createComment(content: string, threadID: string): Promise<CommentInterface | undefined> {
    return this.docOrchestrator.createComment(content, threadID)
  }

  async beganTypingInThread(threadID: string): Promise<void> {
    return this.docOrchestrator.beganTypingInThread(threadID)
  }

  async stoppedTypingInThread(threadID: string): Promise<void> {
    return this.docOrchestrator.stoppedTypingInThread(threadID)
  }

  async unresolveThread(threadId: string): Promise<boolean> {
    return this.docOrchestrator.unresolveThread(threadId)
  }

  async editComment(threadID: string, commentID: string, content: string): Promise<boolean> {
    return this.docOrchestrator.editComment(threadID, commentID, content)
  }

  async deleteComment(threadID: string, commentID: string): Promise<boolean> {
    return this.docOrchestrator.deleteComment(threadID, commentID)
  }

  async getAllThreads(): Promise<CommentThreadInterface[]> {
    return this.docOrchestrator.getAllThreads()
  }

  async createCommentThread(
    commentContent: string,
    markID?: string,
    createMarkNode?: boolean,
  ): Promise<CommentThreadInterface | undefined> {
    return this.docOrchestrator.createCommentThread(commentContent, markID, createMarkNode)
  }

  async createSuggestionThread(
    suggestionID: string,
    commentContent: string,
    suggestionType: SuggestionSummaryType,
  ): Promise<CommentThreadInterface | undefined> {
    return this.docOrchestrator.createSuggestionThread(suggestionID, commentContent, suggestionType)
  }

  async resolveThread(threadId: string): Promise<boolean> {
    return this.docOrchestrator.resolveThread(threadId)
  }

  async acceptSuggestion(threadId: string, summary: string): Promise<boolean> {
    return this.docOrchestrator.acceptSuggestion(threadId, summary)
  }

  async rejectSuggestion(threadId: string, summary?: string): Promise<boolean> {
    return this.docOrchestrator.rejectSuggestion(threadId, summary)
  }

  async reopenSuggestion(threadId: string): Promise<boolean> {
    return this.docOrchestrator.reopenSuggestion(threadId)
  }

  async deleteThread(id: string): Promise<boolean> {
    return this.docOrchestrator.deleteThread(id)
  }

  async markThreadAsRead(id: string): Promise<void> {
    return this.docOrchestrator.markThreadAsRead(id)
  }

  async handleAwarenessStateUpdate(states: SafeDocsUserState[]): Promise<void> {
    return this.docOrchestrator.handleAwarenessStateUpdate(states)
  }

  async openLink(url: string): Promise<void> {
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.click()
    link.remove()
  }

  async reportUserInterfaceError(
    error: Error,
    extraInfo?: { irrecoverable?: boolean; errorInfo?: ErrorInfo; lockEditor?: boolean },
  ): Promise<void> {
    this.docOrchestrator.editorReportingError(error.message, {
      irrecoverable: extraInfo?.irrecoverable,
      lockEditor: extraInfo?.lockEditor,
    })
  }

  async reportWordCount(wordCountInfo: WordCountInfoCollection): Promise<void> {
    this.eventBus.publish({
      type: WordCountEvent,
      payload: wordCountInfo,
    })
  }

  updateFrameSize(size: number): void {
    if (this.editorFrame) {
      this.editorFrame.style.setProperty('--print-min-height', `${size}px`)
    }
  }

  showGenericAlertModal(message: string): void {
    this.eventBus.publish({
      type: ApplicationEvent.GeneralUserDisplayableErrorOccurred,
      payload: {
        translatedError: message,
      },
    })
  }

  async fetchExternalImageAsBase64(url: string): Promise<string | undefined> {
    return this.docOrchestrator.fetchExternalImageAsBase64(url)
  }
}
