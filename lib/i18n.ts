export const DEFAULT_LOCALE = "zh";
export const LOCALE_STORAGE_KEY = "chat-locale";

export const locales = ["zh", "en"] as const;

export type Locale = (typeof locales)[number];

export const localeOptions: Array<{
  id: Locale;
  label: string;
  shortLabel: string;
}> = [
  {
    id: "zh",
    label: "中文",
    shortLabel: "中",
  },
  {
    id: "en",
    label: "English",
    shortLabel: "EN",
  },
];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getLocalePreferencePrompt(locale: Locale) {
  if (locale === "en") {
    return [
      "Conversation language preference: English.",
      "Always reply in English, even when the user's message is written in another language.",
      "Only switch away from English if the user explicitly asks you to reply in a different language.",
    ].join("\n");
  }

  return [
    "对话语言偏好：中文。",
    "始终使用中文回复，即使用户用其他语言输入。",
    "只有当用户明确要求你使用另一种语言回复时，才切换到其他语言。",
  ].join("\n");
}

export const chatTranslations = {
  zh: {
    app: {
      name: "Chatbot",
    },
    language: {
      label: "语言",
      tooltip: "选择语言",
    },
    visibility: {
      private: {
        label: "私密",
        description: "只有你可以访问此对话",
      },
      public: {
        label: "公开",
        description: "任何拥有链接的人都可以访问此对话",
      },
      share: "分享",
      more: "更多",
      delete: "删除",
    },
    sidebar: {
      openSidebar: "打开侧栏",
      newChat: "新建对话",
      deleteAll: "删除全部",
      deleteAllChats: "删除所有对话？",
      deleteAllDescription:
        "此操作无法撤销。这会永久删除你的所有对话，并将它们从服务器移除。",
      deleteAllAction: "删除全部",
      allChatsDeleted: "所有对话已删除",
      history: "历史",
      loginToSave: "登录后可保存并回看历史对话！",
      emptyHistory: "开始聊天后，你的对话会显示在这里。",
      today: "今天",
      yesterday: "昨天",
      lastWeek: "最近 7 天",
      lastMonth: "最近 30 天",
      older: "更早",
      loading: "加载中...",
      deleteChatTitle: "确定要删除吗？",
      deleteChatDescription:
        "此操作无法撤销。这会永久删除该对话，并将其从服务器移除。",
      continue: "继续",
      chatDeleted: "对话已删除",
      guest: "访客",
      toggleTheme: (theme: "light" | "dark") =>
        `切换到${theme === "light" ? "深色" : "浅色"}模式`,
      checkingAuth: "正在检查登录状态，请稍后再试！",
      login: "登录账号",
      signOut: "退出登录",
    },
    greeting: {
      title: "有什么可以帮你？",
      subtitle: "提问、写代码，或一起探索想法。",
    },
    input: {
      editingMessage: "正在编辑消息",
      cancel: "取消",
      editPlaceholder: "编辑你的消息...",
      askPlaceholder: "尽管问我...",
      waitForResponse: "请等待模型完成当前回复。",
      uploadFailed: "文件上传失败，请重试！",
      uploadFilesFailed: "文件上传失败",
      pastedImage: "粘贴的图片",
      uploadPastedFailed: "粘贴图片上传失败",
      renameAvailable: "可在侧栏的对话菜单中重命名。",
      deleteThisChat: "删除此对话？",
      delete: "删除",
      chatDeleted: "对话已删除",
      deleteAllChats: "删除所有对话？",
      deleteAll: "删除全部",
      allChatsDeleted: "所有对话已删除",
      attachImage: "上传图片",
      waitForCurrentResponse: "请等待当前回复完成",
      modelNoVision: "当前模型不支持图片附件",
      searchModels: "搜索模型...",
      noModels: "未找到模型。",
      channels: "渠道",
      models: "模型",
      loading: "加载中...",
    },
    shell: {
      activateGatewayTitle: "启用 AI Gateway",
      activateGatewayDescriptionPrefix: "此应用需要",
      activateGatewayOwner: "所有者",
      activateGatewayYou: "你",
      activateGatewayDescriptionSuffix: "启用 Vercel AI Gateway。",
      cancel: "取消",
      activate: "启用",
    },
    messages: {
      scrollToBottom: "滚动到底部",
      copy: "复制",
      edit: "编辑",
      noTextToCopy: "没有可复制的文本！",
      copied: "已复制到剪贴板！",
      upvote: "赞同回复",
      downvote: "反对回复",
      upvoting: "正在赞同回复...",
      downvoting: "正在反对回复...",
      upvoted: "已赞同回复！",
      downvoted: "已反对回复！",
      upvoteFailed: "赞同回复失败。",
      downvoteFailed: "反对回复失败。",
    },
    suggestions: [
      "使用 Next.js 有哪些优势？",
      "写一段代码演示 Dijkstra 算法",
      "帮我写一篇关于硅谷的文章",
      "旧金山天气怎么样？",
    ],
  },
  en: {
    app: {
      name: "Chatbot",
    },
    language: {
      label: "Language",
      tooltip: "Choose language",
    },
    visibility: {
      private: {
        label: "Private",
        description: "Only you can access this chat",
      },
      public: {
        label: "Public",
        description: "Anyone with the link can access this chat",
      },
      share: "Share",
      more: "More",
      delete: "Delete",
    },
    sidebar: {
      openSidebar: "Open sidebar",
      newChat: "New chat",
      deleteAll: "Delete all",
      deleteAllChats: "Delete all chats?",
      deleteAllDescription:
        "This action cannot be undone. This will permanently delete all your chats and remove them from our servers.",
      deleteAllAction: "Delete All",
      allChatsDeleted: "All chats deleted",
      history: "History",
      loginToSave: "Login to save and revisit previous chats!",
      emptyHistory:
        "Your conversations will appear here once you start chatting!",
      today: "Today",
      yesterday: "Yesterday",
      lastWeek: "Last 7 days",
      lastMonth: "Last 30 days",
      older: "Older",
      loading: "Loading...",
      deleteChatTitle: "Are you absolutely sure?",
      deleteChatDescription:
        "This action cannot be undone. This will permanently delete your chat and remove it from our servers.",
      continue: "Continue",
      chatDeleted: "Chat deleted",
      guest: "Guest",
      toggleTheme: (theme: "light" | "dark") =>
        `Toggle ${theme === "light" ? "dark" : "light"} mode`,
      checkingAuth: "Checking authentication status, please try again!",
      login: "Login to your account",
      signOut: "Sign out",
    },
    greeting: {
      title: "What can I help with?",
      subtitle: "Ask a question, write code, or explore ideas.",
    },
    input: {
      editingMessage: "Editing message",
      cancel: "Cancel",
      editPlaceholder: "Edit your message...",
      askPlaceholder: "Ask anything...",
      waitForResponse: "Please wait for the model to finish its response!",
      uploadFailed: "Failed to upload file, please try again!",
      uploadFilesFailed: "Failed to upload files",
      pastedImage: "Pasted image",
      uploadPastedFailed: "Failed to upload pasted image(s)",
      renameAvailable: "Rename is available from the sidebar chat menu.",
      deleteThisChat: "Delete this chat?",
      delete: "Delete",
      chatDeleted: "Chat deleted",
      deleteAllChats: "Delete all chats?",
      deleteAll: "Delete all",
      allChatsDeleted: "All chats deleted",
      attachImage: "Attach an image",
      waitForCurrentResponse: "Wait for the current response to finish",
      modelNoVision: "Current model does not support image attachments",
      searchModels: "Search models...",
      noModels: "No models found.",
      channels: "Channels",
      models: "Models",
      loading: "Loading...",
    },
    shell: {
      activateGatewayTitle: "Activate AI Gateway",
      activateGatewayDescriptionPrefix: "This application requires",
      activateGatewayOwner: "the owner",
      activateGatewayYou: "you",
      activateGatewayDescriptionSuffix: "to activate Vercel AI Gateway.",
      cancel: "Cancel",
      activate: "Activate",
    },
    messages: {
      scrollToBottom: "Scroll to bottom",
      copy: "Copy",
      edit: "Edit",
      noTextToCopy: "There's no text to copy!",
      copied: "Copied to clipboard!",
      upvote: "Upvote Response",
      downvote: "Downvote Response",
      upvoting: "Upvoting Response...",
      downvoting: "Downvoting Response...",
      upvoted: "Upvoted Response!",
      downvoted: "Downvoted Response!",
      upvoteFailed: "Failed to upvote response.",
      downvoteFailed: "Failed to downvote response.",
    },
    suggestions: [
      "What are the advantages of using Next.js?",
      "Write code to demonstrate Dijkstra's algorithm",
      "Help me write an essay about Silicon Valley",
      "What is the weather in San Francisco?",
    ],
  },
} as const;

export type ChatTranslations = (typeof chatTranslations)[Locale];

export function getChatTranslations(locale: Locale): ChatTranslations {
  return chatTranslations[locale];
}
