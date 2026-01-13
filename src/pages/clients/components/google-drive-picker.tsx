import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

interface GoogleDrivePickerProps {
  onFolderSelected: (folderUrl: string, folderName: string) => void;
}

export function GoogleDrivePicker({ onFolderSelected }: GoogleDrivePickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadGoogleAPI = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.gapi && window.google?.picker) {
        resolve();
        return;
      }

      // Load Google API Client (gapi)
      if (!window.gapi) {
        const gapiScript = document.createElement("script");
        gapiScript.src = "https://apis.google.com/js/api.js";
        gapiScript.onload = () => {
          window.gapi.load("picker", () => {
            loadGoogleIdentityServices().then(resolve).catch(reject);
          });
        };
        gapiScript.onerror = () => reject(new Error("Failed to load Google API"));
        document.body.appendChild(gapiScript);
      } else {
        window.gapi.load("picker", () => {
          loadGoogleIdentityServices().then(resolve).catch(reject);
        });
      }
    });
  };

  const loadGoogleIdentityServices = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }

      const gisScript = document.createElement("script");
      gisScript.src = "https://accounts.google.com/gsi/client";
      gisScript.onload = () => {
        // Wait for the library to be available
        const checkGoogleIdentity = setInterval(() => {
          if (window.google?.accounts?.oauth2) {
            clearInterval(checkGoogleIdentity);
            resolve();
          }
        }, 100);

        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkGoogleIdentity);
          if (!window.google?.accounts?.oauth2) {
            reject(new Error("Google Identity Services library not available"));
          }
        }, 5000);
      };
      gisScript.onerror = () => reject(new Error("Failed to load Google Identity Services"));
      document.body.appendChild(gisScript);
    });
  };

  const handlePickFolder = async () => {
    setIsLoading(true);
    try {
      await loadGoogleAPI();

      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

      if (!apiKey || !clientId) {
        toast({
          title: "Configuration Error",
          description: "Google Drive API credentials not configured. Please set VITE_GOOGLE_API_KEY and VITE_GOOGLE_CLIENT_ID in your .env file.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Authenticate user
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/drive.readonly",
        callback: (response: any) => {
          if (response.access_token) {
            createPicker(response.access_token, apiKey);
          } else {
            setIsLoading(false);
          }
        },
      });

      tokenClient.requestAccessToken();
    } catch (error) {
      console.error("Error loading Google Picker:", error);
      toast({
        title: "Error",
        description: "Failed to load Google Drive Picker. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const createPicker = (accessToken: string, apiKey: string) => {
    const picker = new window.google.picker.PickerBuilder()
      .addView(
        new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
          .setSelectFolderEnabled(true)
          .setIncludeFolders(true)
      )
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const folder = data.docs[0];
          const folderUrl = `https://drive.google.com/drive/folders/${folder.id}`;
          onFolderSelected(folderUrl, folder.name);
          toast({
            title: "Folder Selected",
            description: `Selected folder: ${folder.name}`,
          });
        }
        setIsLoading(false);
      })
      .build();

    picker.setVisible(true);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handlePickFolder}
      disabled={isLoading}
      title="Select Google Drive folder"
    >
      <FolderOpen className="h-4 w-4" />
    </Button>
  );
}
