"use client";

import { Component, Suspense, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { DataError, forgetDataFile, type DataFileName } from "@/lib/fetchData";

const subscribe = () => () => {};

/** True only in the browser, after hydration (data files load client-side). */
function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

class Catch extends Component<
  { onError: (error: unknown) => ReactNode; children: ReactNode },
  { error: unknown }
> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  render() {
    return this.state.error ? this.props.onError(this.state.error) : this.props.children;
  }
}

function explain(error: unknown) {
  if (error instanceof DataError) {
    switch (error.kind) {
      case "offline":
        return "The data file couldn't be reached. Check your connection and try again.";
      case "timeout":
        return "The data took too long to arrive. Try again in a moment.";
      case "http":
        return `${error.message} Try again, or come back after the next data refresh.`;
      case "format":
        return `${error.message} The site and its data are out of sync; a refresh usually fixes it.`;
    }
  }
  return "Something went wrong while showing this data. Try again.";
}

/**
 * Loads one data file for its children: skeleton while loading, an
 * error with a retry when it fails. Children read the file with
 * `use(loadDataFile(name))`.
 */
export function DataBoundary({
  file,
  what,
  fallback,
  children,
}: {
  file: DataFileName;
  /** Plural noun for messages: "Projections", "Waiver targets". */
  what: string;
  fallback: ReactNode;
  children: ReactNode;
}) {
  const isClient = useIsClient();
  const [attempt, setAttempt] = useState(0);

  if (!isClient) return <>{fallback}</>;

  return (
    <Catch
      key={attempt}
      onError={(error) => (
        <ErrorState
          title={`${what} didn't load`}
          action={
            <Button
              variant="primary"
              onClick={() => {
                forgetDataFile(file);
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </Button>
          }
        >
          {explain(error)}
        </ErrorState>
      )}
    >
      <Suspense fallback={fallback}>{children}</Suspense>
    </Catch>
  );
}
