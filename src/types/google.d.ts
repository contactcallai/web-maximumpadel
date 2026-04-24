declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenClientConfig {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
      }

      interface TokenResponse {
        access_token: string;
        expires_in: string;
        hd?: string;
        prompt: string;
        scope: string;
        token_type: string;
        error?: string;
        error_description?: string;
        error_uri?: string;
      }

      interface OverridableTokenClientConfig {
        prompt?: string;
        login_hint?: string;
        state?: string;
      }

      interface TokenClient {
        callback: (response: TokenResponse) => void;
        requestAccessToken(overrideConfig?: OverridableTokenClientConfig): void;
      }

      function initTokenClient(config: TokenClientConfig): TokenClient;
    }
  }

  namespace picker {
    enum ViewId {
      DOCS = 'docs',
      DOCS_IMAGES = 'docs_images',
      DOCS_IMAGES_AND_VIDEOS = 'docs_images_and_videos',
      DOCS_VIDEOS = 'docs_videos',
      DOCUMENTS = 'documents',
      DRAWINGS = 'drawings',
      FOLDERS = 'folders',
      FORMS = 'forms',
      PDFS = 'pdfs',
      PRESENTATIONS = 'presentations',
      SPREADSHEETS = 'spreadsheets',
    }

    enum Action {
      CANCEL = 'cancel',
      PICKED = 'picked',
    }

    interface Response {
      [key: string]: any;
      action: Action;
      docs: Array<{
        id: string;
        name: string;
        mimeType: string;
        url: string;
        [key: string]: any;
      }>;
    }

    class Picker {
      setVisible(visible: boolean): void;
    }

    class PickerBuilder {
      constructor();
      addView(view: ViewId | any): PickerBuilder;
      setOAuthToken(token: string): PickerBuilder;
      setDeveloperKey(key: string): PickerBuilder;
      setCallback(callback: (response: Response) => void): PickerBuilder;
      build(): Picker;
    }

    class DocsView {
      constructor(viewId: ViewId);
      setParent(parentId: string): DocsView;
      setIncludeFolders(include: boolean): DocsView;
      setMode(mode: string): DocsView;
    }
  }
}

declare namespace gapi {
  function load(feature: string, callback: () => void): void;
  function load(feature: string, config: { callback: () => void; onerror?: () => void; timeout?: number; ontouchstart?: () => void }): void;
}
