import { Args, Command, Flags } from "@oclif/core";
import { processYouTubeVideo, runGraphGenerator } from "@ai-citizens/graph";

export default class TestGraph extends Command {
  static override args = {
    type: Args.string({ description: "type of graph to run" }),
  };

  static override description = "describe the command here";

  static override examples = ["<%= config.bin %> <%= command.id %>"];

  static override flags = {
    // flag with no value (-f, --force)
    force: Flags.boolean({ char: "f" }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(TestGraph);

    if (args.type === "youtube" || !args.type) {
      const parsedVideo = await processYouTubeVideo();
      console.log(parsedVideo);
    }

    if (args.type === "graph") {
      const parsedGraph = await runGraphGenerator(
        "generate a graph for a chatbot",
        {
          configurable: {
            thread_id: "123",
          },
        }
      );
      console.log(parsedGraph);
    }
  }
}
