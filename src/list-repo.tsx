import {
  Action,
  ActionPanel,
  Application,
  Icon,
  Keyboard,
  List,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { homedir } from "node:os";
import { useMemo } from "react";
import { createGhqExecutor, listRepositories, resolveGhqBinary, type Repository } from "./lib/ghq";

export default function Command() {
  const preferences = getPreferenceValues<Preferences.ListRepo>();
  // Enter opens with the first configured app, ⌘ + Enter with the second (Raycast's default action shortcuts).
  const openers = [preferences.editor, preferences.terminal].filter((app): app is Application => app !== undefined);

  const ghqBinary = useMemo(() => resolveGhqBinary(preferences.ghqPath, homedir()), [preferences.ghqPath]);

  const {
    data: repositories,
    isLoading,
    error,
  } = useCachedPromise((binary: string) => listRepositories(createGhqExecutor(binary)), [ghqBinary ?? ""], {
    execute: ghqBinary !== undefined,
    initialData: [] as Repository[],
    keepPreviousData: true,
    failureToastOptions: { title: "Failed to run ghq" },
  });

  if (!ghqBinary) {
    return (
      <EmptyState
        title="ghq Path Not Configured"
        description="Set the absolute path to the ghq binary in the extension preferences."
      />
    );
  }

  if (openers.length === 0) {
    return (
      <EmptyState
        title="Editor or Terminal Not Configured"
        description="Choose at least one application to open repositories with in the extension preferences."
      />
    );
  }

  if (error) {
    return <EmptyState title="Failed to Run ghq" description={error.message} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search repositories…">
      <List.EmptyView
        icon={Icon.Folder}
        title="No Repositories"
        description="Run `ghq get <repository>` to clone a repository into your ghq root."
      />
      {repositories.map((repository) => (
        <RepositoryItem key={repository.path} repository={repository} openers={openers} />
      ))}
    </List>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Warning}
        title={title}
        description={description}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function RepositoryItem({ repository, openers }: { repository: Repository; openers: Application[] }) {
  return (
    <List.Item
      icon={Icon.Folder}
      title={repository.relativePath}
      keywords={[repository.name, repository.owner, repository.host].filter((k): k is string => Boolean(k))}
      accessories={repository.host ? [{ text: repository.host }] : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {openers.map((app) => (
              <Action.Open
                key={app.path}
                title={`Open in ${app.name}`}
                icon={{ fileIcon: app.path }}
                target={repository.path}
                application={app}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.ShowInFinder path={repository.path} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
            <Action.CopyToClipboard
              title="Copy Path"
              content={repository.path}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
