import { memo, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { artifactDefinitions, type UIArtifact } from "./artifact";
import type { ArtifactActionContext } from "./create-artifact";

type ArtifactActionsProps = {
  artifact: UIArtifact;
  handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void;
  currentVersionIndex: number;
  isCurrentVersion: boolean;
  mode: "edit" | "diff";
  metadata: ArtifactActionContext["metadata"];
  setMetadata: ArtifactActionContext["setMetadata"];
};

function PureArtifactActions({
  artifact,
  handleVersionChange,
  currentVersionIndex,
  isCurrentVersion,
  mode,
  metadata,
  setMetadata,
}: ArtifactActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLocale();

  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifact.kind
  );

  if (!artifactDefinition) {
    throw new Error("Artifact definition not found!");
  }

  const actionContext: ArtifactActionContext = {
    content: artifact.content,
    handleVersionChange,
    currentVersionIndex,
    isCurrentVersion,
    mode,
    metadata,
    setMetadata,
  };
  const translatedActionDescriptions: Record<string, string> = {
    "Add comments": t.artifact.addComments,
    "Add final polish": t.artifact.finalPolish,
    "Add logs": t.artifact.addLogs,
    "Analyze and visualize data": t.artifact.analyzeData,
    "Copy as .csv": t.artifact.copyCsv,
    "Copy code to clipboard": t.artifact.copyCode,
    "Copy image to clipboard": t.artifact.copyImage,
    "Copy to clipboard": t.artifact.copyText,
    "Execute code": t.artifact.executeCode,
    "Fix error": t.artifact.fixError,
    "Format and clean data": t.artifact.formatData,
    "Request suggestions": t.artifact.requestSuggestions,
    "View Next version": t.artifact.nextVersion,
    "View Previous version": t.artifact.previousVersion,
    "View changes": t.artifact.viewChanges,
  };

  return (
    <div className="flex flex-col items-center gap-0.5">
      {artifactDefinition.actions.map((action) => {
        const actionDescription =
          translatedActionDescriptions[action.description] ??
          action.description;
        const disabled =
          isLoading || artifact.status === "streaming"
            ? true
            : action.isDisabled
              ? action.isDisabled(actionContext)
              : false;

        return (
          <Tooltip key={action.description}>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-center rounded-full p-3 text-muted-foreground transition-all duration-150",
                  "hover:text-foreground",
                  "active:scale-95",
                  "disabled:pointer-events-none disabled:opacity-30",
                  {
                    "text-foreground":
                      mode === "diff" && action.description === "View changes",
                  }
                )}
                disabled={disabled}
                onClick={async () => {
                  setIsLoading(true);

                  try {
                    await Promise.resolve(action.onClick(actionContext));
                  } catch (_error) {
                    toast.error(t.artifact.executeFailed);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                type="button"
              >
                {action.icon}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>
              {actionDescription}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export const ArtifactActions = memo(
  PureArtifactActions,
  (prevProps, nextProps) => {
    if (prevProps.artifact.status !== nextProps.artifact.status) {
      return false;
    }
    if (prevProps.currentVersionIndex !== nextProps.currentVersionIndex) {
      return false;
    }
    if (prevProps.isCurrentVersion !== nextProps.isCurrentVersion) {
      return false;
    }
    if (prevProps.artifact.content !== nextProps.artifact.content) {
      return false;
    }
    if (prevProps.mode !== nextProps.mode) {
      return false;
    }

    return true;
  }
);
