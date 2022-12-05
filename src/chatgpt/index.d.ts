import { ChromiumBrowserContext, Page } from 'playwright';

declare class ChatGPTAPI {
    protected _userDataDir: string;
    protected _headless: boolean;
    protected _markdown: boolean;
    protected _chatUrl: string;
    protected _browser: ChromiumBrowserContext;
    protected _page: Page;
    /**
     * @param opts.userDataDir — Path to a directory for storing persistent chromium session data
     * @param opts.chatUrl — OpenAI chat URL
     * @param opts.headless - Whether or not to use headless mode
     * @param opts.markdown — Whether or not to parse chat messages as markdown
     */
    constructor(opts?: {
        /** @defaultValue `'/tmp/chatgpt'` **/
        userDataDir?: string;
        /** @defaultValue `'https://chat.openai.com/'` **/
        chatUrl?: string;
        /** @defaultValue `false` **/
        headless?: boolean;
        /** @defaultValue `true` **/
        markdown?: boolean;
    });
    init(opts?: {
        auth?: 'blocking' | 'eager';
    }): Promise<Page>;
    getIsSignedIn(): Promise<boolean>;
    getLastMessage(): Promise<string | null>;
    getPrompts(): Promise<string[]>;
    getMessages(): Promise<string[]>;
    sendMessage(message: string): Promise<string>;
    close(): Promise<void>;
    protected _getInputBox(): Promise<any>;
}

/**
 * https://chat.openapi.com/api/auth/session
 */
type SessionResult = {
    /**
     * Object of the current user
     */
    user: APIUser;
    /**
     * ISO date of the expiration date of the access token
     */
    expires: string;
    /**
     * The access token
     */
    accessToken: string;
};
type APIUser = {
    /**
     * ID of the user
     */
    id: string;
    /**
     * Name of the user
     */
    name: string;
    /**
     * Email of the user
     */
    email: string;
    /**
     * Image of the user
     */
    image: string;
    /**
     * Picture of the user
     */
    picture: string;
    /**
     * Groups the user is in
     */
    groups: string[] | [];
    /**
     * Features the user is in
     */
    features: string[] | [];
};
/**
 * https://chat.openapi.com/backend-api/models
 */
type ModelsResult = {
    /**
     * Array of models
     */
    models: APIModel[];
};
type APIModel = {
    /**
     * Name of the model
     */
    slug: string;
    /**
     * Max tokens of the model
     */
    max_tokens: number;
    /**
     * Whether or not the model is special
     */
    is_special: boolean;
};
/**
 * https://chat.openapi.com/backend-api/moderations
 */
type ModerationsJSONBody = {
    /**
     * Input for the moderation decision
     */
    input: string;
    /**
     * The model to use in the decision
     */
    model: AvailableModerationModels;
};
type AvailableModerationModels = 'text-moderation-playground';
/**
 * https://chat.openapi.com/backend-api/moderations
 */
type ModerationsJSONResult = {
    /**
     * Whether or not the input is flagged
     */
    flagged: boolean;
    /**
     * Whether or not the input is blocked
     */
    blocked: boolean;
    /**
     * The ID of the decision
     */
    moderation_id: string;
};
/**
 * https://chat.openapi.com/backend-api/conversation
 */
type ConversationJSONBody = {
    /**
     * The action to take
     */
    action: string;
    /**
     * The ID of the conversation
     */
    conversation_id?: string;
    /**
     * Prompts to provide
     */
    messages: APIPrompt[];
    /**
     * The model to use
     */
    model: string;
    /**
     * The parent message ID
     */
    parent_message_id: string;
};
type APIPrompt = {
    /**
     * The content of the prompt
     */
    content: APIPromptContent;
    /**
     * The ID of the prompt
     */
    id: string;
    /**
     * The role played in the prompt
     */
    role: APIPromptRole;
};
type APIPromptContent = {
    /**
     * The content type of the prompt
     */
    content_type: APIPromptContentType;
    /**
     * The parts to the prompt
     */
    parts: string[];
};
type APIPromptContentType = 'text';
type APIPromptRole = 'user';
/**
 * https://chat.openapi.com/backend-api/conversation/message_feedback
 */
type MessageFeedbackJSONBody = {
    /**
     * The ID of the conversation
     */
    conversation_id: string;
    /**
     * The message ID
     */
    message_id: string;
    /**
     * The rating
     */
    rating: APIMessageFeedbackRating;
    /**
     * Tags to give the rating
     */
    tags?: APIMessageFeedbackTags[];
    /**
     * The text to include
     */
    text?: string;
};
type APIMessageFeedbackTags = 'harmful' | 'false' | 'not-helpful';
type MessageFeedbackResult = {
    /**
     * The message ID
     */
    message_id: string;
    /**
     * The ID of the conversation
     */
    conversation_id: string;
    /**
     * The ID of the user
     */
    user_id: string;
    /**
     * The rating
     */
    rating: APIMessageFeedbackRating;
    /**
     * The text the server received, including tags
     */
    text?: string;
};
type APIMessageFeedbackRating = 'thumbsUp' | 'thumbsDown';

export { APIMessageFeedbackRating, APIMessageFeedbackTags, APIModel, APIPrompt, APIPromptContent, APIPromptContentType, APIPromptRole, APIUser, AvailableModerationModels, ChatGPTAPI, ConversationJSONBody, MessageFeedbackJSONBody, MessageFeedbackResult, ModelsResult, ModerationsJSONBody, ModerationsJSONResult, SessionResult };
