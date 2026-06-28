export type FolderAccessRequest = {
  folderName?: string;
  resolve: (allowed: boolean) => void;
};

type FolderAccessHandler = (request: FolderAccessRequest) => void;

let folderAccessHandler: FolderAccessHandler | null = null;

export function registerFolderAccessHandler(handler: FolderAccessHandler | null) {
  folderAccessHandler = handler;
}

export function requestFolderAccess(folderName?: string): Promise<boolean> {
  if (!folderAccessHandler) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    folderAccessHandler?.({ folderName, resolve });
  });
}
