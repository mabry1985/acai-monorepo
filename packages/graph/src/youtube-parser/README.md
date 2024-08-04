{langgraph_docs}
Using the above context around LangGraph, create the graph the user is requesting.

Here is an example of how I like to structure my graphs, please make sure to add all the nodes and edges you need to the graph builder at once, trying to organize chronologically or logically is a good idea.

Follow strict typing and type checking and guards, this is a good way to make sure that your graph is working as expected.

Annotate logic as needed to help explain the graph to the user, but only mock out the functions of the nodes in comments and return test data where applicable.

```ts
import { END, START, StateGraph, StateGraphArgs } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { IterableReadableStream } from "@langchain/core/utils/stream";

// Define the YouTube video state interface
interface YouTubeVideoState {
  title: string;
  description: string;
  summary: string;
  relatedUrls: string[];
  url: string;
  highlights: string[];
  transcription: string;
  /*
    messages field for potential LLM interactions
  */
  messages: BaseMessage[];
  error: string;
}

const stringReducer = (prev: string = "", next?: string): string =>
  next ?? prev;
const arrayReducer = <T>(prev: T[] = [], next?: T[]): T[] => {
  if (!next) return prev;
  return [...prev, ...next];
};
// Update the graphState with specific reducers for YouTube video state
const youtubeGraphState: StateGraphArgs<YouTubeVideoState>["channels"] = {
  title: {
    default: () => "",
    value: stringReducer,
  },
  description: {
    default: () => "",
    value: stringReducer,
  },
  summary: {
    default: () => "",
    value: stringReducer,
  },
  relatedUrls: {
    default: () => [],
    value: (prev: string[] = [], next?: string[]): string[] => {
      if (!next) return prev;
      return [...new Set([...prev, ...next])];
    },
  },
  url: {
    default: () => "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    value: stringReducer,
  },
  highlights: {
    default: () => [],
    value: arrayReducer,
  },
  transcription: {
    default: () => "",
    value: (prev: string = "", next?: string): string => next ?? prev,
  },
  messages: {
    default: () => [],
    value: arrayReducer,
  },
  error: {
    default: () => "",
    value: stringReducer,
  },
};

// Define the YouTube graph
const youtubeGraphBuilder = new StateGraph<YouTubeVideoState>({
  channels: youtubeGraphState,
});

youtubeGraphBuilder
  .addNode("getMetadata", async (state) => {
    console.log("getMetadata", state);
    // Fetch metadata (title, url, etc.) from YouTube API
    // Return updated state or catch error to send to handleError node
    // if error {
    //   return {
    //     error: "Error in processing video metadata",
    // };
    // }
    return {
      title: "Test Title",
      description: "Test Description",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      transcription: "Test Transcription",
    };
  })
  .addNode("getRelatedUrls", async (state) => {
    console.log("getRelatedUrls", state);
    // Fetch related URLs
    // Return updated state
    return {
      relatedUrls: ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    };
  })
  .addNode("extractHighlights", async (state) => {
    console.log("extractHighlights", state);
    // Extract highlights from video content
    // Return updated state
    return {
      highlights: ["Highlight 1", "Highlight 2"],
    };
  })
  .addNode("generateSummary", async (state) => {
    console.log("generateSummary", state);
    // Generate summary of the video
    // Return updated state
    return {
      summary: "Test Summary",
    };
  })
  .addNode("handleMissingTranscription", async (state) => {
    console.log("Error in processing video metadata");
    // @TODO: will use a more brute force method by ripping the audio from the video and transcribing ourselves
    // we still want the meta data from the video though and will need to process in some capacity
    return {
      title: "Test Title",
      description: "Test Description",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      transcription: "Brute Forced Test Transcription",
    };
  })
  .addEdge(START, "getMetadata")
  .addEdge("getMetadata", "getRelatedUrls")
  .addEdge("getMetadata", "extractHighlights")
  .addEdge("getMetadata", "generateSummary")
  .addEdge("getRelatedUrls", END)
  .addEdge("extractHighlights", END)
  .addEdge("generateSummary", END)
  .addEdge("handleMissingTranscription", "getRelatedUrls")
  .addEdge("handleMissingTranscription", "extractHighlights")
  .addEdge("handleMissingTranscription", "generateSummary")
  .addConditionalEdges("getMetadata", (state) => {
    // Example condition: if title is empty, go to error handling node
    // else move to the next nodes
    return state.title
      ? ["getRelatedUrls", "extractHighlights", "generateSummary"]
      : "handleMissingTranscription";
  });
const youtubeGraph = youtubeGraphBuilder.compile();

export const processYouTubeVideo = async (
  videoUrl: string,
  config?: { configurable: { thread_id: string } }
): Promise<YouTubeVideoState> => {
  const initialState: Partial<YouTubeVideoState> = {
    url: videoUrl,
  };
  const finalState = await youtubeGraph.invoke(initialState, config);
  return finalState;
};

// Example of how to use streaming
export const streamYouTubeVideoProcessing = async (
  videoUrl: string,
  config?: { configurable: { thread_id: string } }
): Promise<IterableReadableStream<YouTubeVideoState>> => {
  const initialState: Partial<YouTubeVideoState> = {
    url: videoUrl,
  };
  const stream = await youtubeGraph.stream(initialState, {
    ...config,
    configurable: { ...config?.configurable, stream_events: true },
  });
  return stream;
};
```